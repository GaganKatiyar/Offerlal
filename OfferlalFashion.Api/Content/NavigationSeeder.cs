using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Content;

/// <summary>
/// Seeds the header, footer and store settings from what is currently
/// hardcoded, resolving links to real categories and occasions where possible.
///
/// As with the homepage, this reproduces today's navigation rather than
/// improving it — so that a difference after the migration means a bug, not a
/// design decision.
/// </summary>
public sealed class NavigationSeeder(OfferlalFashionDbContext db, ILogger<NavigationSeeder> log)
{
    /// <summary>
    /// NAV_LINKS from header.ts, verbatim. Where a link points at a category
    /// or occasion the seeder resolves the real entity so the URL comes from
    /// its slug — renaming the category then updates the nav automatically
    /// instead of leaving a dead link.
    /// </summary>
    private static readonly (string Label, string Url, string Icon)[] HeaderLinks =
    [
        ("New Arrivals", "/new-arrivals", "✨"),
        ("Lehengas", "/category/bridal-lehengas", "👗"),
        ("Bridal", "/bridal", "💍"),
        ("Wedding Edit", "/occasion/wedding-guest", "🎊"),
        ("Bridesmaids", "/occasion/sangeet-mehendi", "👯"),
        ("Collections", "/collections", "🗂️"),
        ("Sale", "/sale", "🏷️"),
    ];

    /// <summary>The footer's four link columns, copied from footer.html.</summary>
    private static readonly (string Group, string[] Labels, string[] Urls)[] FooterColumns =
    [
        ("Online Shopping",
            ["Bridal Lehengas", "Party Wear", "Sarees", "Anarkali & Gowns", "Bridal Jewellery", "New Arrivals", "Sale"],
            ["/category/bridal-lehengas", "/category/party-wear", "/category/sarees", "/category/anarkali-gowns", "/category/bridal-jewellery", "/new-arrivals", "/sale"]),
        ("Customer Policies",
            ["Contact Us", "FAQs", "Track Orders", "Size & Fit Guide", "Exchange & Returns", "Privacy Policy", "Terms of Use"],
            ["/contact", "/faq", "/track-order", "/faq", "/faq", "/faq", "/faq"]),
        ("Company",
            ["About Us", "Bridal Concierge"],
            ["/about", "/bridal-concierge"]),
    ];

    /// <summary>
    /// Values that were duplicated across components. The shipping numbers
    /// appeared in cart-page.ts, checkout.html and pdp.html; the WhatsApp
    /// number in three more places.
    /// </summary>
    private static readonly (string Key, string Value, string Type, string Group, string Description)[] Settings =
    [
        ("shipping.freeThreshold", "2999", "decimal", "shipping", "Order value above which standard shipping is free."),
        ("shipping.flatFee", "150", "decimal", "shipping", "Standard shipping charge below the free threshold."),
        ("shipping.expressFee", "250", "decimal", "shipping", "Express shipping charge."),
        ("contact.whatsapp", "917390965819", "string", "contact", "WhatsApp number in international format, no plus sign."),
        ("contact.email", "hello@offerlal.com", "string", "contact", "Customer support email."),
        ("announcement.text", "Free Shipping on Orders Above ₹2,999  |  Easy Exchange  |  Secure Payments", "string", "general", "Announcement bar copy."),
    ];

    public async Task<object> SeedAsync(CancellationToken ct = default)
    {
        var settingsAdded = await SeedSettingsAsync(ct);

        if (await db.NavMenus.AnyAsync(ct))
        {
            log.LogInformation("Navigation already seeded; no menu changes made");
            return new { menusCreated = 0, itemsCreated = 0, settingsAdded, alreadySeeded = true };
        }

        var categories = await db.Categories.ToDictionaryAsync(c => "/category/" + c.Slug, ct);
        var occasions = await db.Occasions.ToDictionaryAsync(o => "/occasion/" + o.Slug, ct);

        var header = new NavMenu { Code = "header", Name = "Header Navigation" };
        var footer = new NavMenu { Code = "footer", Name = "Footer Links" };
        db.NavMenus.AddRange(header, footer);
        await db.SaveChangesAsync(ct);

        var items = 0;
        var order = 0;

        foreach (var (label, url, icon) in HeaderLinks)
        {
            var item = new NavItem
            {
                MenuId = header.Id,
                Label = label,
                IconName = icon,
                DisplayOrder = order += 10,
                IsHighlighted = label == "Sale",
            };

            // Prefer a real entity reference over a literal URL.
            if (categories.TryGetValue(url, out var category)) item.CategoryId = category.Id;
            else if (occasions.TryGetValue(url, out var occasion)) item.OccasionId = occasion.Id;
            else item.Url = url;

            db.NavItems.Add(item);
            items++;
        }
        await db.SaveChangesAsync(ct);

        var groupOrder = 0;
        foreach (var (group, labels, urls) in FooterColumns)
        {
            var parent = new NavItem
            {
                MenuId = footer.Id,
                Label = group,
                DisplayOrder = groupOrder += 10,
                ColumnIndex = (byte)(groupOrder / 10),
            };
            db.NavItems.Add(parent);
            await db.SaveChangesAsync(ct);
            items++;

            var childOrder = 0;
            for (var i = 0; i < labels.Length; i++)
            {
                var child = new NavItem
                {
                    MenuId = footer.Id,
                    ParentId = parent.Id,
                    Label = labels[i],
                    DisplayOrder = childOrder += 10,
                    ColumnIndex = parent.ColumnIndex,
                };

                if (categories.TryGetValue(urls[i], out var category)) child.CategoryId = category.Id;
                else if (occasions.TryGetValue(urls[i], out var occasion)) child.OccasionId = occasion.Id;
                else child.Url = urls[i];

                db.NavItems.Add(child);
                items++;
            }
            await db.SaveChangesAsync(ct);
        }

        log.LogInformation("Navigation seeded: 2 menus, {Items} items, {Settings} settings", items, settingsAdded);
        return new { menusCreated = 2, itemsCreated = items, settingsAdded, alreadySeeded = false };
    }

    private async Task<int> SeedSettingsAsync(CancellationToken ct)
    {
        var existing = await db.StoreSettings.Select(s => s.Key).ToListAsync(ct);
        var added = 0;

        foreach (var (key, value, type, group, description) in Settings)
        {
            if (existing.Contains(key)) continue;
            db.StoreSettings.Add(new StoreSetting
            {
                Key = key,
                Value = value,
                ValueType = type,
                Group = group,
                Description = description,
                UpdatedAt = DateTime.UtcNow,
            });
            added++;
        }

        await db.SaveChangesAsync(ct);
        return added;
    }
}
