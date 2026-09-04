namespace OfferlalFashion.Api.Models;

/// <summary>Known role names. Referenced by [Authorize(Roles = ...)].</summary>
public static class Roles
{
    public const string Admin = "Admin";
    public const string Catalog = "Catalog";
    public const string Orders = "Orders";
    public const string Content = "Content";
    public const string Customer = "Customer";

    private static readonly string[] All = [Admin, Catalog, Orders, Content, Customer];

    /// <summary>
    /// Maps a stored role to its canonical casing.
    ///
    /// [Authorize(Roles = ...)] compares ordinally, so a row storing "admin"
    /// against a constant of "Admin" authenticates successfully and is then
    /// refused with 403 — which reads like a permissions bug rather than a
    /// casing one. The pre-auth schema stored exactly that.
    /// </summary>
    public static string Canonical(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return Customer;
        return All.FirstOrDefault(r => string.Equals(r, role.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? role.Trim();
    }
}

/// <summary>
/// A refresh token, stored HASHED.
///
/// Access tokens are short-lived and never stored; refresh tokens are
/// long-lived and therefore worth stealing, so the database holds only a hash.
/// A leaked database backup then yields no usable session.
///
/// Rotation is one-time-use: refreshing revokes the presented token and issues
/// a new one. If a revoked token is presented again the whole family is
/// revoked, because the only way that happens is a token having been copied.
/// </summary>
public partial class RefreshToken
{
    public int Id { get; set; }

    /// <summary>SHA-256 of the token. The raw value exists only in the client.</summary>
    public string TokenHash { get; set; } = null!;

    /// <summary>Customer id or admin user id, as text.</summary>
    public string SubjectId { get; set; } = null!;

    /// <summary>customer | admin</summary>
    public string SubjectType { get; set; } = null!;

    public DateTime ExpiresAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }

    /// <summary>Set when this token was rotated, so a reuse can be traced.</summary>
    public int? ReplacedByTokenId { get; set; }

    public string? CreatedByIp { get; set; }
}
