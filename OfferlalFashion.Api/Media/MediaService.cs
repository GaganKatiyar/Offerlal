using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace OfferlalFashion.Api.Media;

public sealed record UploadResult(MediaAsset Asset, bool WasExisting);

/// <summary>
/// The media library's write path: ingest an image, generate derivatives,
/// record it once.
/// </summary>
public sealed class MediaService(
    OfferlalFashionDbContext db,
    IMediaStorage storage,
    ILogger<MediaService> log)
{
    /// <summary>
    /// Derivative widths.
    ///
    /// These exist because the storefront's srcset only ever worked for
    /// images.pexels.com URLs, which carry a `w=` query parameter their CDN
    /// honours. Own-hosted images get no free resizing, so without derivatives
    /// a phone downloads the full-size desktop image — the single biggest
    /// mobile LCP cost in a client-rendered SPA with no SSR.
    ///
    /// A derivative is only generated when it is SMALLER than the source;
    /// upscaling a 600px photo to 1600px produces a bigger file that looks
    /// worse.
    /// </summary>
    public static readonly int[] DerivativeWidths = [480, 800, 1600];

    private static readonly string[] AllowedContentTypes =
        ["image/jpeg", "image/png", "image/webp", "image/avif"];

    private const long MaxUploadBytes = 15 * 1024 * 1024;

    public async Task<UploadResult> UploadAsync(
        Stream content,
        string fileName,
        string contentType,
        string folder,
        string? altText,
        CancellationToken ct = default)
    {
        if (!AllowedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Unsupported image type '{contentType}'.");
        }

        // Buffer once: the stream is read three times (hash, probe, encode) and
        // an upload stream is generally not seekable.
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        if (buffer.Length == 0) throw new InvalidOperationException("Uploaded file is empty.");
        if (buffer.Length > MaxUploadBytes)
        {
            throw new InvalidOperationException($"Image exceeds the {MaxUploadBytes / 1024 / 1024}MB limit.");
        }

        buffer.Position = 0;
        var checksum = Convert.ToHexString(await SHA256.HashDataAsync(buffer, ct)).ToLowerInvariant();

        // Re-uploading the same file returns the existing asset rather than a
        // duplicate. Without this, the same banner uploaded by two people is
        // two assets with two alt texts that drift apart.
        var existing = await db.MediaAssets.FirstOrDefaultAsync(a => a.ChecksumSha256 == checksum, ct);
        if (existing is not null)
        {
            log.LogInformation("Upload {FileName} matched existing asset {AssetId} by checksum", fileName, existing.Id);
            return new UploadResult(existing, WasExisting: true);
        }

        buffer.Position = 0;
        using var image = await Image.LoadAsync(buffer, ct);

        var now = DateTime.UtcNow;
        var key = $"{now:yyyy}/{now:MM}/{checksum[..16]}";

        // Everything is normalised to WebP. One output format means one
        // derivative naming convention and no per-format branching downstream.
        var encoder = new WebpEncoder { Quality = 82 };

        buffer.Position = 0;
        using (var original = new MemoryStream())
        {
            await image.SaveAsync(original, encoder, ct);
            original.Position = 0;
            await storage.SaveAsync($"{key}.webp", original, ct);
        }

        var generated = new List<int>();
        foreach (var width in DerivativeWidths)
        {
            if (width >= image.Width) continue; // never upscale

            using var resized = image.Clone(c => c.Resize(new ResizeOptions
            {
                Size = new Size(width, 0),
                Mode = ResizeMode.Max,
            }));

            using var derivative = new MemoryStream();
            await resized.SaveAsync(derivative, encoder, ct);
            derivative.Position = 0;
            await storage.SaveAsync($"{key}-{width}.webp", derivative, ct);
            generated.Add(width);
        }

        var asset = new MediaAsset
        {
            StorageKey = $"{key}.webp",
            Url = storage.GetPublicUrl($"{key}.webp"),
            ContentType = "image/webp",
            Width = image.Width,
            Height = image.Height,
            Bytes = buffer.Length,
            AltText = string.IsNullOrWhiteSpace(altText) ? null : altText.Trim(),
            Folder = string.IsNullOrWhiteSpace(folder) ? "uploads" : folder.Trim(),
            DerivativeWidths = generated.Count > 0 ? string.Join(',', generated) : null,
            ChecksumSha256 = checksum,
            CreatedAt = now,
        };

        db.MediaAssets.Add(asset);
        await db.SaveChangesAsync(ct);

        log.LogInformation(
            "Stored media asset {AssetId} ({Width}x{Height}, {Derivatives} derivatives)",
            asset.Id, asset.Width, asset.Height, generated.Count);

        return new UploadResult(asset, WasExisting: false);
    }

    /// <summary>
    /// Registers an image that lives on someone else's host.
    ///
    /// The demo catalogue is entirely external stock photography. Cataloguing
    /// those rather than downloading them keeps the library honest — it does
    /// not claim to host files it does not — while still giving every image a
    /// single row to carry alt text and be referenced by.
    /// </summary>
    public async Task<MediaAsset> RegisterExternalAsync(
        string url,
        string folder,
        string? altText,
        CancellationToken ct = default)
    {
        var normalised = url.Trim();

        // Check the CHANGE TRACKER before the database.
        //
        // The backfill registers many references before saving, so several rows
        // can name the same picture while none of them are persisted yet. A
        // database-only lookup misses those and inserts a duplicate, which the
        // unique index on Url then rejects. This catalogue has 166 references
        // over 74 pictures, so that is the common case, not an edge case.
        var pending = db.MediaAssets.Local.FirstOrDefault(a => a.Url == normalised);
        if (pending is not null)
        {
            if (string.IsNullOrWhiteSpace(pending.AltText) && !string.IsNullOrWhiteSpace(altText))
            {
                pending.AltText = altText.Trim();
            }
            return pending;
        }

        var existing = await db.MediaAssets.FirstOrDefaultAsync(a => a.Url == normalised, ct);
        if (existing is not null)
        {
            // Fill in alt text if this reference has one and the asset does not.
            if (string.IsNullOrWhiteSpace(existing.AltText) && !string.IsNullOrWhiteSpace(altText))
            {
                existing.AltText = altText.Trim();
            }
            return existing;
        }

        var asset = new MediaAsset
        {
            StorageKey = null,
            Url = normalised,
            SourceUrl = normalised,
            ContentType = GuessContentType(normalised),
            AltText = string.IsNullOrWhiteSpace(altText) ? null : altText.Trim(),
            Folder = folder,
            CreatedAt = DateTime.UtcNow,
        };

        db.MediaAssets.Add(asset);
        return asset;
    }

    private static string GuessContentType(string url)
    {
        var path = url.Split('?')[0].ToLowerInvariant();
        return Path.GetExtension(path) switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".avif" => "image/avif",
            ".svg" => "image/svg+xml",
            _ => "image/jpeg",
        };
    }
}
