using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Auth;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "offerlal";
    public string Audience { get; set; } = "offerlal-storefront";

    /// <summary>
    /// Signing key. MUST come from configuration in any non-development
    /// environment; startup fails rather than falling back to a default,
    /// because a shipped default signing key lets anyone mint valid tokens.
    /// </summary>
    public string SigningKey { get; set; } = "";

    /// <summary>Short by design — a stolen access token expires on its own.</summary>
    public int AccessTokenMinutes { get; set; } = 15;

    public int RefreshTokenDays { get; set; } = 30;
}

public sealed record IssuedTokens(string AccessToken, string RefreshToken, DateTime AccessExpiresAtUtc);

/// <summary>
/// Issues and rotates tokens.
///
/// Access tokens are stateless JWTs, short-lived, never stored. Refresh tokens
/// are long-lived random values stored only as a SHA-256 hash, so a leaked
/// database yields no usable session.
/// </summary>
public sealed class TokenService(OfferlalFashionDbContext db, JwtOptions options)
{
    public const string SubjectTypeCustomer = "customer";
    public const string SubjectTypeAdmin = "admin";

    public async Task<IssuedTokens> IssueAsync(
        string subjectId,
        string subjectType,
        string displayName,
        IReadOnlyCollection<string> roles,
        string? ip,
        CancellationToken ct = default)
    {
        var expires = DateTime.UtcNow.AddMinutes(options.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, subjectId),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new("name", displayName),
            new("stype", subjectType),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.SigningKey));
        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        var access = new JwtSecurityTokenHandler().WriteToken(token);
        var refresh = await CreateRefreshTokenAsync(subjectId, subjectType, ip, ct);

        return new IssuedTokens(access, refresh, expires);
    }

    /// <summary>
    /// Exchanges a refresh token for a new pair.
    ///
    /// One-time use: the presented token is revoked and replaced. Presenting an
    /// ALREADY-revoked token revokes every live token for that subject, because
    /// the only way that happens is the token having been copied — and at that
    /// point ending both sessions is the right answer.
    /// </summary>
    public async Task<(RefreshToken? Token, bool Reused)> ValidateRefreshAsync(string rawToken, CancellationToken ct = default)
    {
        var hash = Hash(rawToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null) return (null, false);

        if (stored.RevokedAtUtc is not null)
        {
            var live = await db.RefreshTokens
                .Where(t => t.SubjectType == stored.SubjectType
                         && t.SubjectId == stored.SubjectId
                         && t.RevokedAtUtc == null)
                .ToListAsync(ct);

            foreach (var t in live) t.RevokedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return (stored, true);
        }

        if (stored.ExpiresAtUtc <= DateTime.UtcNow) return (null, false);

        return (stored, false);
    }

    public async Task<string> RotateAsync(RefreshToken current, string? ip, CancellationToken ct = default)
    {
        current.RevokedAtUtc = DateTime.UtcNow;
        var replacement = await CreateRefreshTokenAsync(current.SubjectId, current.SubjectType, ip, ct);

        var stored = await db.RefreshTokens.FirstAsync(t => t.TokenHash == Hash(replacement), ct);
        current.ReplacedByTokenId = stored.Id;
        await db.SaveChangesAsync(ct);

        return replacement;
    }

    public async Task RevokeAllAsync(string subjectId, string subjectType, CancellationToken ct = default)
    {
        var live = await db.RefreshTokens
            .Where(t => t.SubjectType == subjectType && t.SubjectId == subjectId && t.RevokedAtUtc == null)
            .ToListAsync(ct);

        foreach (var t in live) t.RevokedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    private async Task<string> CreateRefreshTokenAsync(string subjectId, string subjectType, string? ip, CancellationToken ct)
    {
        // 256 bits from a cryptographic RNG. Guid is NOT suitable here — it is
        // not guaranteed unpredictable.
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

        db.RefreshTokens.Add(new RefreshToken
        {
            TokenHash = Hash(raw),
            SubjectId = subjectId,
            SubjectType = subjectType,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(options.RefreshTokenDays),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByIp = ip,
        });
        await db.SaveChangesAsync(ct);

        return raw;
    }

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
}
