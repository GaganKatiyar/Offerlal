namespace OfferlalFashion.Api.Media;

public sealed class LocalDiskMediaStorageOptions
{
    /// <summary>Filesystem root. Defaults to wwwroot/media under the content root.</summary>
    public string? RootPath { get; set; }

    /// <summary>URL prefix these files are served from.</summary>
    public string PublicPrefix { get; set; } = "/media";
}

/// <summary>
/// Stores media on the local filesystem under wwwroot, served by the static
/// file middleware. Appropriate for a single VPS; swap for Blob/S3 when a
/// second instance exists, without touching any call site.
/// </summary>
public sealed class LocalDiskMediaStorage : IMediaStorage
{
    private readonly string _root;
    private readonly string _publicPrefix;

    public LocalDiskMediaStorage(IWebHostEnvironment env, LocalDiskMediaStorageOptions options)
    {
        _root = options.RootPath ?? Path.Combine(env.ContentRootPath, "wwwroot", "media");
        _publicPrefix = options.PublicPrefix.TrimEnd('/');
        Directory.CreateDirectory(_root);
    }

    public async Task SaveAsync(string storageKey, Stream content, CancellationToken ct = default)
    {
        var path = ResolvePath(storageKey);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        await using var file = File.Create(path);
        await content.CopyToAsync(file, ct);
    }

    public Task<bool> ExistsAsync(string storageKey, CancellationToken ct = default) =>
        Task.FromResult(File.Exists(ResolvePath(storageKey)));

    public Task DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        var path = ResolvePath(storageKey);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    public string GetPublicUrl(string storageKey) => $"{_publicPrefix}/{storageKey.Replace('\\', '/')}";

    /// <summary>
    /// Resolves a key to an absolute path, refusing anything that escapes the
    /// root. Storage keys are generated internally today, but this is the
    /// function an upload filename would eventually reach, and path traversal
    /// is far cheaper to prevent here than to discover later.
    /// </summary>
    private string ResolvePath(string storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey))
        {
            throw new ArgumentException("Storage key must not be empty.", nameof(storageKey));
        }

        var combined = Path.GetFullPath(Path.Combine(_root, storageKey.Replace('/', Path.DirectorySeparatorChar)));
        var rootFull = Path.GetFullPath(_root);

        if (!combined.StartsWith(rootFull + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(combined, rootFull, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"Storage key '{storageKey}' escapes the media root.", nameof(storageKey));
        }

        return combined;
    }
}
