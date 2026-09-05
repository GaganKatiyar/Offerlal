namespace OfferlalFashion.Api.Models;

/// <summary>Which flow a token belongs to. One table, not two, since the shape is identical.</summary>
public static class VerificationPurpose
{
    public const string EmailVerification = "EmailVerification";
    public const string PasswordReset = "PasswordReset";
}

/// <summary>
/// A short-lived, single-use code sent by email — either to verify an address at
/// registration, or to authorise a password reset.
///
/// Never stored raw. The value emailed to the customer is hashed the same way
/// RefreshToken hashes its value, and only the hash is compared on redemption —
/// a leaked database row cannot be used to complete either flow.
/// </summary>
public partial class CustomerVerificationToken
{
    public int Id { get; set; }

    public string CustomerId { get; set; } = null!;

    public string Purpose { get; set; } = null!;

    public string TokenHash { get; set; } = null!;

    public DateTime ExpiresAtUtc { get; set; }

    public DateTime? UsedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public virtual Customer Customer { get; set; } = null!;
}
