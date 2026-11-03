using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;

namespace OfferlalFashion.Api.Media;

public sealed record BackfillReport
{
    public int AssetsCreated { get; init; }
    public int AssetsReused { get; init; }
    public int ProductImagesLinked { get; init; }
    public int CategoryHeroesLinked { get; init; }
    public int CategoryThumbnailsLinked { get; init; }
    public int OccasionsLinked { get; init; }
    public int BrandsLinked { get; init; }
    public int TotalReferences { get; init; }
}

/// <summary>
/// Points every existing image URL at a library asset.
///
/// Idempotent: it only fills rows whose asset FK is still null, and asset
/// creation deduplicates on URL. Re-running after adding products links the
/// new ones and leaves the rest alone.
///
/// The URL columns are deliberately left in place. They stay authoritative
/// until the read paths, the admin forms and the seed scripts all go through
/// MediaAssetId; dropping them in the same change as introducing the FK would
/// mean no way back if the backfill got something wrong.
/// </summary>
public sealed class MediaBackfillService(
    OfferlalFashionDbContext db,
    MediaService media,
    ILogger<MediaBackfillService> log)
{
    public async Task<BackfillReport> RunAsync(CancellationToken ct = default)
    {
        var createdBefore = await db.MediaAssets.CountAsync(ct);
        var reused = 0;
        var references = 0;

        // --- Product images ---------------------------------------------------
        var productImages = await db.ProductImages
            .Where(i => i.MediaAssetId == null && i.Url != null)
            .ToListAsync(ct);

        foreach (var image in productImages)
        {
            // Deliberately does NOT seed the asset's alt text from this row.
            //
            // ProductImages.Alt describes a USAGE ("Ivory Pearl Lehenga - front
            // view"); MediaAsset.AltText describes the PICTURE. They are only
            // the same thing when an image belongs to exactly one product, and
            // in this catalogue they mostly do not — one stock photo is shared
            // by seven different products. Seeding from the first reference
            // made an ivory lehenga's card announce "Wine Velvet Bridal
            // Lehenga", which is worse than no asset-level alt at all.
            //
            // Asset alt text is authored in admin. Until then the reference's
            // own alt is used, which is correct per usage.
            var asset = await media.RegisterExternalAsync(image.Url, "products", altText: null, ct);
            if (asset.Id != 0) reused++; // already persisted, so this reference reuses it
            image.MediaAsset = asset;
            references++;
        }
        await db.SaveChangesAsync(ct);

        // --- Categories -------------------------------------------------------
        var categories = await db.Categories
            .Where(c => c.HeroImageAssetId == null || c.ThumbnailAssetId == null)
            .ToListAsync(ct);

        var heroes = 0;
        var thumbs = 0;
        foreach (var category in categories)
        {
            if (category.HeroImageAssetId is null && !string.IsNullOrWhiteSpace(category.HeroImageUrl))
            {
                var asset = await media.RegisterExternalAsync(category.HeroImageUrl, "categories", altText: null, ct);
                await db.SaveChangesAsync(ct);
                category.HeroImageAssetId = asset.Id;
                heroes++;
                references++;
            }

            if (category.ThumbnailAssetId is null && !string.IsNullOrWhiteSpace(category.ThumbnailUrl))
            {
                var asset = await media.RegisterExternalAsync(category.ThumbnailUrl, "categories", altText: null, ct);
                await db.SaveChangesAsync(ct);
                category.ThumbnailAssetId = asset.Id;
                thumbs++;
                references++;
            }
        }
        await db.SaveChangesAsync(ct);

        // --- Occasions --------------------------------------------------------
        var occasions = await db.Occasions
            .Where(o => o.ImageAssetId == null)
            .ToListAsync(ct);

        foreach (var occasion in occasions)
        {
            if (string.IsNullOrWhiteSpace(occasion.ImageUrl)) continue;
            var asset = await media.RegisterExternalAsync(occasion.ImageUrl, "occasions", altText: null, ct);
            await db.SaveChangesAsync(ct);
            occasion.ImageAssetId = asset.Id;
            references++;
        }
        await db.SaveChangesAsync(ct);

        // --- Brands -----------------------------------------------------------
        var brands = await db.Brands
            .Where(b => b.LogoAssetId == null && b.LogoUrl != null)
            .ToListAsync(ct);

        foreach (var brand in brands)
        {
            if (string.IsNullOrWhiteSpace(brand.LogoUrl)) continue;
            var asset = await media.RegisterExternalAsync(brand.LogoUrl, "brands", $"{brand.Name} logo", ct);
            await db.SaveChangesAsync(ct);
            brand.LogoAssetId = asset.Id;
            references++;
        }
        await db.SaveChangesAsync(ct);

        var createdAfter = await db.MediaAssets.CountAsync(ct);

        var report = new BackfillReport
        {
            AssetsCreated = createdAfter - createdBefore,
            AssetsReused = reused,
            ProductImagesLinked = productImages.Count,
            CategoryHeroesLinked = heroes,
            CategoryThumbnailsLinked = thumbs,
            OccasionsLinked = occasions.Count,
            BrandsLinked = brands.Count,
            TotalReferences = references,
        };

        log.LogInformation(
            "Media backfill: {References} references resolved to {Created} assets",
            report.TotalReferences, report.AssetsCreated);

        return report;
    }
}
