using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class AdminUser
{
    public string Id { get; set; } = null!;

    public string Username { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Role { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
}
