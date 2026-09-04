namespace OfferlalFashion.Api.Media;

/// <summary>
/// Where image bytes physically live.
///
/// An interface with one local-disk implementation today. The point is not
/// speculative generality — it is that the storage backend is a one-way door
/// once ~10k image URLs are in the database, and moving to Blob/S3 later must
/// be an implementation swap rather than a rewrite of every call site.
/// </summary>
public interface IMediaStorage
{
    /// <summary>Writes bytes at a storage key, overwriting any existing object.</summary>
    Task SaveAsync(string storageKey, Stream content, CancellationToken ct = default);

    Task<bool> ExistsAsync(string storageKey, CancellationToken ct = default);

    Task DeleteAsync(string storageKey, CancellationToken ct = default);

    /// <summary>
    /// The URL a browser fetches this object from. Site-relative for local
    /// disk; absolute for a CDN-backed store later.
    /// </summary>
    string GetPublicUrl(string storageKey);
}
