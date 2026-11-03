using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Auth;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    OfferlalFashionDbContext db,
    TokenService tokens,
    VerificationService verification,
    IPasswordHasher<AdminUser> adminHasher,
    IPasswordHasher<Customer> customerHasher,
    ILogger<AuthController> log) : ControllerBase
{
    [HttpPost("admin/login")]
    public async Task<ActionResult<AuthResponse>> AdminLogin([FromBody] LoginRequest request, CancellationToken ct = default)
    {
        var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Username == request.Username, ct);

        // One message for "no such user" and "wrong password" alike. Different
        // responses tell an attacker which usernames exist.
        if (user is null || !user.IsActive)
        {
            await FakeWorkAsync();
            return Unauthorized(new { message = "Invalid username or password." });
        }

        var result = adminHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            log.LogWarning("Failed admin login for {Username} from {Ip}", request.Username, ClientIp());
            return Unauthorized(new { message = "Invalid username or password." });
        }

        // Identity tells us when a stored hash used older parameters; rehashing
        // on successful login upgrades accounts without a migration.
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = adminHasher.HashPassword(user, request.Password);
        }

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var roles = new List<string> { Roles.Canonical(user.Role) };
        var issued = await tokens.IssueAsync(
            user.Id, TokenService.SubjectTypeAdmin, user.DisplayName ?? user.Username, roles, ClientIp(), ct);

        return Ok(new AuthResponse
        {
            AccessToken = issued.AccessToken,
            RefreshToken = issued.RefreshToken,
            ExpiresAtUtc = issued.AccessExpiresAtUtc,
            DisplayName = user.DisplayName ?? user.Username,
            Roles = roles,
            MustChangePassword = user.MustChangePassword,
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> CustomerLogin([FromBody] LoginRequest request, CancellationToken ct = default)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Email == request.Username, ct);

        if (customer is null)
        {
            await FakeWorkAsync();
            return Unauthorized(new { message = "Invalid email or password." });
        }

        // The demo data seeded plaintext-ish hashes; anything that does not
        // verify is a failure rather than a fallback. A "if the hash looks odd,
        // let them in" path is how demo shortcuts reach production.
        var result = customerHasher.VerifyHashedPassword(customer, customer.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            customer.PasswordHash = customerHasher.HashPassword(customer, request.Password);
            await db.SaveChangesAsync(ct);
        }

        var issued = await tokens.IssueAsync(
            customer.Id, TokenService.SubjectTypeCustomer,
            $"{customer.FirstName} {customer.LastName}".Trim(),
            [Roles.Customer], ClientIp(), ct);

        return Ok(new AuthResponse
        {
            AccessToken = issued.AccessToken,
            RefreshToken = issued.RefreshToken,
            ExpiresAtUtc = issued.AccessExpiresAtUtc,
            DisplayName = customer.FirstName,
            Roles = [Roles.Customer],
        });
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await db.Customers.AnyAsync(c => c.Email == email, ct))
        {
            return Conflict(new { message = "An account with that email already exists." });
        }

        if (request.Password.Length < 8)
        {
            return BadRequest(new { message = "Password must be at least 8 characters." });
        }

        var customer = new Customer
        {
            Id = $"cust-{Guid.NewGuid():N}"[..20],
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Phone = request.Phone.Trim(),
            RegisteredAt = DateTime.UtcNow,
            Segment = "New",
        };
        customer.PasswordHash = customerHasher.HashPassword(customer, request.Password);

        db.Customers.Add(customer);
        await db.SaveChangesAsync(ct);

        // Best-effort. A flaky mail server must not turn a successful account
        // creation into a failed request — the customer already exists in the
        // database at this point, and the account works with or without a
        // verified email (see Customer.EmailVerifiedAt).
        try
        {
            await verification.SendEmailVerificationAsync(customer, ct);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Could not send verification email to {CustomerId}", customer.Id);
        }

        var issued = await tokens.IssueAsync(
            customer.Id, TokenService.SubjectTypeCustomer, customer.FirstName, [Roles.Customer], ClientIp(), ct);

        return Ok(new AuthResponse
        {
            AccessToken = issued.AccessToken,
            RefreshToken = issued.RefreshToken,
            ExpiresAtUtc = issued.AccessExpiresAtUtc,
            DisplayName = customer.FirstName,
            Roles = [Roles.Customer],
        });
    }

    /// <summary>Re-sends the registration code — for a lost or expired email.</summary>
    [HttpPost("resend-verification")]
    [Authorize(Roles = Roles.Customer)]
    public async Task<IActionResult> ResendVerification(CancellationToken ct = default)
    {
        var customerId = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        var customer = await db.Customers.FindAsync([customerId], ct);
        if (customer is null) return Unauthorized();

        if (customer.EmailVerifiedAt is not null)
        {
            return Ok(new { message = "This email is already verified." });
        }

        await verification.SendEmailVerificationAsync(customer, ct);
        return Ok(new { message = "Verification code sent." });
    }

    /// <summary>Redeems the 6-digit code sent at registration or by resend-verification.</summary>
    [HttpPost("verify-email")]
    [Authorize(Roles = Roles.Customer)]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request, CancellationToken ct = default)
    {
        var customerId = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        if (customerId is null) return Unauthorized();

        var ok = await verification.TryRedeemAsync(customerId, VerificationPurpose.EmailVerification, request.Code, ct);
        if (!ok) return BadRequest(new { message = "That code is incorrect or has expired." });

        var customer = await db.Customers.FindAsync([customerId], ct);
        if (customer is not null)
        {
            customer.EmailVerifiedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return Ok(new { message = "Email verified." });
    }

    /// <summary>
    /// Starts a password reset. Always returns the same generic message,
    /// whether or not the address is registered — the alternative turns this
    /// endpoint into a way to test which emails have an Offerlal account.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Email == email, ct);

        if (customer is not null)
        {
            await verification.SendPasswordResetAsync(customer, ct);
        }
        else
        {
            // Same delay an unregistered address would incur if a real email
            // send happened, so the response time does not itself leak whether
            // the account exists.
            await FakeWorkAsync();
        }

        return Ok(new { message = "If that email has an account, a reset code has been sent." });
    }

    /// <summary>
    /// Completes a password reset. Also revokes every existing refresh token
    /// for the customer — a reset is frequently done because a password was
    /// compromised, and leaving old sessions alive would defeat the point.
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Email == email, ct);

        // Deliberately generic on failure too: "no such account" and "wrong
        // code" are indistinguishable from the outside, for the same reason
        // login does not say which half was wrong.
        if (customer is null)
        {
            return BadRequest(new { message = "That code is incorrect or has expired." });
        }

        var ok = await verification.TryRedeemAsync(customer.Id, VerificationPurpose.PasswordReset, request.Code, ct);
        if (!ok) return BadRequest(new { message = "That code is incorrect or has expired." });

        if (request.NewPassword.Length < 8)
        {
            return BadRequest(new { message = "Password must be at least 8 characters." });
        }

        customer.PasswordHash = customerHasher.HashPassword(customer, request.NewPassword);
        await tokens.RevokeAllAsync(customer.Id, TokenService.SubjectTypeCustomer, ct);
        await db.SaveChangesAsync(ct);

        return Ok(new { message = "Password updated. Please sign in again." });
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest request, CancellationToken ct = default)
    {
        var (stored, reused) = await tokens.ValidateRefreshAsync(request.RefreshToken, ct);

        if (reused)
        {
            log.LogWarning(
                "Refresh token REUSE detected for {Type} {Subject} from {Ip}; all sessions revoked",
                stored!.SubjectType, stored.SubjectId, ClientIp());
            return Unauthorized(new { message = "Session expired. Please sign in again." });
        }

        if (stored is null) return Unauthorized(new { message = "Session expired. Please sign in again." });

        string displayName;
        List<string> roles;

        if (stored.SubjectType == TokenService.SubjectTypeAdmin)
        {
            var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Id == stored.SubjectId, ct);
            if (user is null || !user.IsActive) return Unauthorized(new { message = "Session expired." });
            displayName = user.DisplayName ?? user.Username;
            roles = [Roles.Canonical(user.Role)];
        }
        else
        {
            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == stored.SubjectId, ct);
            if (customer is null) return Unauthorized(new { message = "Session expired." });
            displayName = customer.FirstName;
            roles = [Roles.Customer];
        }

        var replacement = await tokens.RotateAsync(stored, ClientIp(), ct);
        var issued = await tokens.IssueAsync(
            stored.SubjectId, stored.SubjectType, displayName, roles, ClientIp(), ct);

        return Ok(new AuthResponse
        {
            AccessToken = issued.AccessToken,
            RefreshToken = replacement,
            ExpiresAtUtc = issued.AccessExpiresAtUtc,
            DisplayName = displayName,
            Roles = roles,
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken ct = default)
    {
        var subjectId = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        var subjectType = User.FindFirstValue("stype");

        if (subjectId is not null && subjectType is not null)
        {
            await tokens.RevokeAllAsync(subjectId, subjectType, ct);
        }

        return NoContent();
    }

    /// <summary>Who the caller is, for the client to rehydrate a session.</summary>
    [HttpGet("me")]
    [Authorize]
    public ActionResult<object> Me() => Ok(new
    {
        subjectId = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub),
        subjectType = User.FindFirstValue("stype"),
        displayName = User.FindFirstValue("name"),
        roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList(),
    });

    [HttpPost("admin/change-password")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct = default)
    {
        var id = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)!;
        var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return Unauthorized();

        if (adminHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword) == PasswordVerificationResult.Failed)
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }

        if (request.NewPassword.Length < 12)
        {
            return BadRequest(new { message = "Admin passwords must be at least 12 characters." });
        }

        user.PasswordHash = adminHasher.HashPassword(user, request.NewPassword);
        user.MustChangePassword = false;
        await db.SaveChangesAsync(ct);

        // Changing a password ends every other session, which is the whole
        // point of changing it after a suspected compromise.
        await tokens.RevokeAllAsync(user.Id, TokenService.SubjectTypeAdmin, ct);

        return NoContent();
    }

    private string? ClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString();

    /// <summary>
    /// Burns comparable time when no user was found, so response timing does
    /// not reveal whether a username exists.
    /// </summary>
    private static Task FakeWorkAsync() => Task.Delay(Random.Shared.Next(80, 160));
}

public sealed record VerifyEmailRequest
{
    public string Code { get; init; } = "";
}

public sealed record ForgotPasswordRequest
{
    public string Email { get; init; } = "";
}

public sealed record ResetPasswordRequest
{
    public string Email { get; init; } = "";
    public string Code { get; init; } = "";
    public string NewPassword { get; init; } = "";
}

public sealed record LoginRequest
{
    public string Username { get; init; } = "";
    public string Password { get; init; } = "";
}

public sealed record RegisterRequest
{
    public string FirstName { get; init; } = "";
    public string LastName { get; init; } = "";
    public string Email { get; init; } = "";
    public string Phone { get; init; } = "";
    public string Password { get; init; } = "";
}

public sealed record RefreshRequest
{
    public string RefreshToken { get; init; } = "";
}

public sealed record ChangePasswordRequest
{
    public string CurrentPassword { get; init; } = "";
    public string NewPassword { get; init; } = "";
}

public sealed record AuthResponse
{
    public string AccessToken { get; init; } = "";
    public string RefreshToken { get; init; } = "";
    public DateTime ExpiresAtUtc { get; init; }
    public string DisplayName { get; init; } = "";
    public IReadOnlyList<string> Roles { get; init; } = [];
    public bool MustChangePassword { get; init; }
}
