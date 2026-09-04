using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

/// <summary>
/// A back-office user.
///
/// Separate from Customers on purpose: they authenticate against different
/// surfaces and have different lifecycles, and one bad role assignment on a
/// merged table would hand a shopper the admin panel.
///
/// Deliberately NOT ASP.NET Core Identity's user store. Customers already live
/// in their own table with their own PasswordHash, and adopting Identity would
/// mean either migrating them into AspNetUsers or running two parallel user
/// stores. Identity's PasswordHasher IS used, because rolling your own password
/// hashing is the classic own-goal.
///
/// One role per user rather than a join table. The team is small, the existing
/// column already models it that way, and adding many-to-many later is additive
/// — whereas restructuring live rows to prove a point is not.
/// </summary>
public partial class AdminUser
{
    public string Id { get; set; } = null!;

    public string Username { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    /// <summary>See <see cref="Roles"/>.</summary>
    public string Role { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public string? Email { get; set; }

    public string? DisplayName { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Forces a password change on next login. Set on the seeded first-run
    /// account so a generated bootstrap password cannot quietly become the
    /// permanent one.
    /// </summary>
    public bool MustChangePassword { get; set; }
}
