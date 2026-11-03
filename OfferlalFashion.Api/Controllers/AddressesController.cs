using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Auth;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// A customer's saved addresses.
///
/// The Addresses table has existed since the beginning with no endpoint over
/// it, so both clients kept their own list. On the app that list was seeded
/// from demo data, which is not merely cosmetic: checkout pre-selected a
/// fabricated person's name and address, and an order placed without noticing
/// shipped to a stranger.
///
/// Like orders, every query is scoped by the customer id from the TOKEN. An
/// address holds a real person's home address and phone number, so an id in the
/// route is never enough to see one.
/// </summary>
[ApiController]
[Route("api/addresses")]
[Authorize(Roles = Roles.Customer)]
public class AddressesController(OfferlalFashionDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AddressDto>>> GetMine(CancellationToken ct = default)
    {
        var customerId = CustomerId();
        if (customerId is null) return Unauthorized();

        var rows = await db.Addresses.AsNoTracking()
            .Where(a => a.CustomerId == customerId)
            .OrderByDescending(a => a.IsDefault)
            .ThenBy(a => a.Label)
            .Select(a => Project(a))
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpPost]
    public async Task<ActionResult<AddressDto>> Create([FromBody] AddressWrite request, CancellationToken ct = default)
    {
        var customerId = CustomerId();
        if (customerId is null) return Unauthorized();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var isFirst = !await db.Addresses.AnyAsync(a => a.CustomerId == customerId, ct);

        var address = new Address
        {
            Id = $"addr-{Guid.NewGuid():N}"[..20],
            CustomerId = customerId,
            // The first address a customer saves is their default, whatever the
            // client asked for: leaving them with no default means checkout has
            // nothing to preselect.
            IsDefault = isFirst || request.IsDefault,
        };

        Apply(address, request);
        db.Addresses.Add(address);

        if (address.IsDefault) await ClearOtherDefaultsAsync(customerId, address.Id, ct);

        await db.SaveChangesAsync(ct);
        return Ok(Project(address));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AddressDto>> Update(string id, [FromBody] AddressWrite request, CancellationToken ct = default)
    {
        var customerId = CustomerId();
        if (customerId is null) return Unauthorized();

        var address = await db.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.CustomerId == customerId, ct);
        if (address is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        Apply(address, request);
        address.IsDefault = request.IsDefault || address.IsDefault;

        if (address.IsDefault) await ClearOtherDefaultsAsync(customerId, address.Id, ct);

        await db.SaveChangesAsync(ct);
        return Ok(Project(address));
    }

    [HttpPost("{id}/default")]
    public async Task<IActionResult> SetDefault(string id, CancellationToken ct = default)
    {
        var customerId = CustomerId();
        if (customerId is null) return Unauthorized();

        var address = await db.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.CustomerId == customerId, ct);
        if (address is null) return NotFound();

        address.IsDefault = true;
        await ClearOtherDefaultsAsync(customerId, id, ct);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct = default)
    {
        var customerId = CustomerId();
        if (customerId is null) return Unauthorized();

        var address = await db.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.CustomerId == customerId, ct);
        if (address is null) return NotFound();

        var wasDefault = address.IsDefault;
        db.Addresses.Remove(address);
        await db.SaveChangesAsync(ct);

        // Deleting the default would otherwise leave the customer with several
        // addresses and none preselected at checkout.
        if (wasDefault)
        {
            var next = await db.Addresses.FirstOrDefaultAsync(a => a.CustomerId == customerId, ct);
            if (next is not null)
            {
                next.IsDefault = true;
                await db.SaveChangesAsync(ct);
            }
        }

        return NoContent();
    }

    // ---------------------------------------------------------------- helpers

    private async Task ClearOtherDefaultsAsync(string customerId, string keepId, CancellationToken ct)
    {
        var others = await db.Addresses
            .Where(a => a.CustomerId == customerId && a.Id != keepId && a.IsDefault)
            .ToListAsync(ct);
        foreach (var o in others) o.IsDefault = false;
    }

    private static void Apply(Address a, AddressWrite r)
    {
        a.Label = r.Label.Trim();
        a.FullName = r.FullName.Trim();
        a.Phone = r.Phone.Trim();
        a.Line1 = r.Line1.Trim();
        a.Line2 = string.IsNullOrWhiteSpace(r.Line2) ? null : r.Line2.Trim();
        a.City = r.City.Trim();
        a.State = r.State.Trim();
        a.Pincode = r.Pincode.Trim();
    }

    /// <summary>
    /// Checked here as well as in the client, because this is what a courier
    /// actually gets. A malformed pincode is a parcel that does not arrive.
    /// </summary>
    private static string? Validate(AddressWrite r)
    {
        if (string.IsNullOrWhiteSpace(r.FullName)) return "A name is required.";
        if (string.IsNullOrWhiteSpace(r.Line1)) return "An address is required.";
        if (string.IsNullOrWhiteSpace(r.City)) return "A city is required.";
        if (string.IsNullOrWhiteSpace(r.State)) return "A state is required.";

        var phone = new string(r.Phone.Where(char.IsDigit).ToArray());
        if (phone.Length < 10) return "A 10-digit mobile number is required.";

        var pin = r.Pincode.Trim();
        if (pin.Length != 6 || !pin.All(char.IsDigit)) return "An Indian pincode is 6 digits.";

        return null;
    }

    private static AddressDto Project(Address a) => new()
    {
        Id = a.Id,
        Label = a.Label,
        FullName = a.FullName,
        Phone = a.Phone,
        Line1 = a.Line1,
        Line2 = a.Line2,
        City = a.City,
        State = a.State,
        Pincode = a.Pincode,
        IsDefault = a.IsDefault,
    };

    private string? CustomerId()
    {
        var type = User.FindFirstValue("stype");
        if (!string.Equals(type, TokenService.SubjectTypeCustomer, StringComparison.OrdinalIgnoreCase)) return null;

        var id = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return string.IsNullOrWhiteSpace(id) ? null : id;
    }
}

public sealed record AddressDto
{
    public string Id { get; init; } = "";
    public string Label { get; init; } = "";
    public string FullName { get; init; } = "";
    public string Phone { get; init; } = "";
    public string Line1 { get; init; } = "";
    public string? Line2 { get; init; }
    public string City { get; init; } = "";
    public string State { get; init; } = "";
    public string Pincode { get; init; } = "";
    public bool IsDefault { get; init; }
}

public sealed record AddressWrite
{
    public string Label { get; init; } = "Home";
    public string FullName { get; init; } = "";
    public string Phone { get; init; } = "";
    public string Line1 { get; init; } = "";
    public string? Line2 { get; init; }
    public string City { get; init; } = "";
    public string State { get; init; } = "";
    public string Pincode { get; init; } = "";
    public bool IsDefault { get; init; }
}
