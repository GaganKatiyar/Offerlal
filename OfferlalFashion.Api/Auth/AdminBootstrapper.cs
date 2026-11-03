using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Auth;

/// <summary>
/// Ensures the roles exist and that there is exactly one way to get a first
/// admin account: a generated password, printed once, that must be changed.
///
/// Replaces credentials hardcoded in the storefront's auth.service.ts as
/// `admin` / `admin123` — in client-side source, so they were public to anyone
/// who opened devtools.
///
/// The bootstrap password is written to the log and never stored in plaintext.
/// It is deliberately NOT a fixed default: a shipped default admin password is
/// the single most reliably exploited thing in any self-hosted application.
/// </summary>
public sealed class AdminBootstrapper(
    OfferlalFashionDbContext db,
    IPasswordHasher<AdminUser> hasher,
    ILogger<AdminBootstrapper> log)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        // An existing account from the pre-auth schema has a hash this app
        // cannot verify and no usable role, so it is upgraded in place rather
        // than left as a dead row that looks like a working login.
        var existing = await db.AdminUsers.FirstOrDefaultAsync(ct);
        if (existing is not null)
        {
            // Canonicalise the stored role even when nothing else needs
            // upgrading: tolerating bad casing at read time is a workaround,
            // fixing the row is the repair.
            var canonical = Roles.Canonical(existing.Role);
            if (existing.Role != canonical)
            {
                existing.Role = canonical;
                await db.SaveChangesAsync(ct);
            }

            if (!string.IsNullOrWhiteSpace(existing.Role) && existing.DisplayName is not null) return;

            var upgraded = GeneratePassword();
            existing.PasswordHash = hasher.HashPassword(existing, upgraded);
            existing.Role = string.IsNullOrWhiteSpace(existing.Role) ? Roles.Admin : Roles.Canonical(existing.Role);
            existing.DisplayName ??= "Administrator";
            existing.Email ??= "admin@offerlal.local";
            existing.IsActive = true;
            existing.MustChangePassword = true;
            await db.SaveChangesAsync(ct);

            log.LogWarning(
                "EXISTING ADMIN ACCOUNT UPGRADED. Username: {Username}  Password: {Password}  "
                + "The previous password no longer works. This is shown once and must be changed on first login.",
                existing.Username, upgraded);
            return;
        }

        var password = GeneratePassword();
        var admin = new AdminUser
        {
            Id = $"admin-{Guid.NewGuid():N}"[..20],
            Username = "admin",
            Email = "admin@offerlal.local",
            DisplayName = "Administrator",
            Role = Roles.Admin,
            CreatedAt = DateTime.UtcNow,
            MustChangePassword = true,
            IsActive = true,
        };
        admin.PasswordHash = hasher.HashPassword(admin, password);

        db.AdminUsers.Add(admin);
        await db.SaveChangesAsync(ct);

        log.LogWarning(
            "FIRST-RUN ADMIN CREATED. Username: admin  Password: {Password}  "
            + "This is shown once and must be changed on first login.",
            password);
    }

    /// <summary>
    /// A readable but high-entropy password: 4 groups of 5 characters from an
    /// unambiguous alphabet (no O/0, I/l/1), which is ~103 bits.
    /// </summary>
    private static string GeneratePassword()
    {
        const string alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        var chars = new char[23];

        for (int i = 0, group = 0; i < chars.Length; i++)
        {
            if (group == 5)
            {
                chars[i] = '-';
                group = 0;
                continue;
            }
            chars[i] = alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];
            group++;
        }

        return new string(chars);
    }
}
