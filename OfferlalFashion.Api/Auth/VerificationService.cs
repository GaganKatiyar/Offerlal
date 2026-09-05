using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Email;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Auth;

/// <summary>
/// Issues and redeems the two email-code flows: verifying an address at
/// registration, and authorising a password reset.
///
/// Same security shape as TokenService's refresh tokens: the value emailed to
/// the customer is never the value stored. Only its SHA-256 hash sits in the
/// database, so a leaked row cannot be replayed.
/// </summary>
public sealed class VerificationService(OfferlalFashionDbContext db, IEmailSender email)
{
    /// <summary>How long a code stays redeemable. Short, because it travels by email.</summary>
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(30);

    /// <summary>
    /// Sends a 6-digit verification code to a newly registered address.
    ///
    /// Best-effort: registration must not fail because a mail server hiccuped.
    /// Callers should await this but never let its exception stop the response —
    /// see AuthController.Register, which logs and continues.
    /// </summary>
    public async Task SendEmailVerificationAsync(Customer customer, CancellationToken ct = default)
    {
        var code = GenerateNumericCode();
        await StoreAsync(customer.Id, VerificationPurpose.EmailVerification, code, ct);

        await email.SendAsync(
            customer.Email,
            "Verify your Offerlal account",
            $"""
             Hi {customer.FirstName},

             Your verification code is: {code}

             This code expires in 30 minutes. If you didn't create an Offerlal account, you can ignore this email.
             """,
            ct);
    }

    /// <summary>
    /// Sends a password reset code.
    ///
    /// Caller decides whether to look up the customer at all — this method only
    /// runs when one was found, so the controller can return the same generic
    /// response whether or not the address is registered, without an enumeration
    /// oracle in HOW LONG the request took either.
    /// </summary>
    public async Task SendPasswordResetAsync(Customer customer, CancellationToken ct = default)
    {
        var code = GenerateNumericCode();
        await StoreAsync(customer.Id, VerificationPurpose.PasswordReset, code, ct);

        await email.SendAsync(
            customer.Email,
            "Reset your Offerlal password",
            $"""
             Hi {customer.FirstName},

             Your password reset code is: {code}

             This code expires in 30 minutes. If you didn't request this, you can ignore this email — your password has not been changed.
             """,
            ct);
    }

    /// <summary>
    /// Redeems a code. Single-use: marks it consumed in the same call, so a
    /// second attempt with the same code — even before it expires — fails.
    /// </summary>
    public async Task<bool> TryRedeemAsync(string customerId, string purpose, string code, CancellationToken ct = default)
    {
        var hash = Hash(Normalize(code));
        var now = DateTime.UtcNow;

        var token = await db.CustomerVerificationTokens
            .Where(t => t.CustomerId == customerId
                && t.Purpose == purpose
                && t.TokenHash == hash
                && t.UsedAtUtc == null
                && t.ExpiresAtUtc > now)
            .OrderByDescending(t => t.CreatedAtUtc)
            .FirstOrDefaultAsync(ct);

        if (token is null) return false;

        token.UsedAtUtc = now;
        await db.SaveChangesAsync(ct);
        return true;
    }

    private async Task StoreAsync(string customerId, string purpose, string code, CancellationToken ct)
    {
        // Any earlier unused code for the same purpose is superseded — only the
        // one just emailed should work, or an old code left lying around stays
        // valid indefinitely alongside the new one.
        var stale = await db.CustomerVerificationTokens
            .Where(t => t.CustomerId == customerId && t.Purpose == purpose && t.UsedAtUtc == null)
            .ToListAsync(ct);
        foreach (var s in stale) s.UsedAtUtc = DateTime.UtcNow;

        db.CustomerVerificationTokens.Add(new CustomerVerificationToken
        {
            CustomerId = customerId,
            Purpose = purpose,
            TokenHash = Hash(code),
            ExpiresAtUtc = DateTime.UtcNow.Add(Lifetime),
            CreatedAtUtc = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Six digits, including leading zeros — "042917" is a valid code.</summary>
    private static string GenerateNumericCode() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    /// <summary>Trims incidental whitespace a customer might paste in around the code.</summary>
    private static string Normalize(string code) => code.Trim();

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
}
