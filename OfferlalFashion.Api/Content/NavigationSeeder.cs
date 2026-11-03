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
            ["/category/bridal-lehengas", "/category/party-wear-lehengas", "/category/sarees", "/category/anarkali-gowns", "/category/bridal-jewellery", "/new-arrivals", "/sale"]),
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

    /// <summary>
    /// Price bands for the mega menu's third column.
    ///
    /// These point at the PLP's existing priceMin/priceMax query params rather
    /// than introducing a new URL shape, so they are shareable and crawlable
    /// like any other filtered view.
    /// </summary>
    private static readonly (string Label, string Query)[] PriceBands =
    [
        ("Under ₹5,000", "/shop?priceMax=5000"),
        ("₹5,000 - ₹15,000", "/shop?priceMin=5000&priceMax=15000"),
        ("₹15,000 - ₹50,000", "/shop?priceMin=15000&priceMax=50000"),
        ("₹50,000 and above", "/shop?priceMin=50000"),
    ];

    /// <summary>
    /// Builds mega-menu columns under the header tabs that warrant one.
    ///
    /// Not every tab gets a panel. "Sale" and "New Arrivals" are destinations,
    /// not categories, and giving them a menu of the same links twice is noise.
    /// A tab with no children stays a plain link, which the header must handle
    /// regardless.
    ///
    /// Columns are Sub-category, Occasion and Price band. Deliberately NOT
    /// Brand, which is Myntra's primary axis: Offerlal is single-brand, so a
    /// brand column would be one entry repeated.
    /// </summary>
    private async Task<int> SeedMegaMenuAsync(NavMenu header, CancellationToken ct)
    {
        var tabs = await db.NavItems
            .Where(i => i.MenuId == header.Id && i.ParentId == null)
            .ToListAsync(ct);

        // Idempotent: if any tab already has children, this has run before.
        var tabIds = tabs.Select(t => t.Id).ToList();
        if (await db.NavItems.AnyAsync(i => i.ParentId != null && tabIds.Contains(i.ParentId.Value), ct))
        {
            return 0;
        }

        var rootCategories = await db.Categories
            .Where(c => c.ParentId == null)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        var childCategories = await db.Categories
            .Where(c => c.ParentId != null)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        var occasions = await db.Occasions.OrderBy(o => o.Name).ToListAsync(ct);

        var added = 0;

        foreach (var tab in tabs)
        {
            // Destinations, not browse axes.
            if (tab.Label is "Sale" or "New Arrivals" or "Collections") continue;

            var order = 0;

            // Column 1 - sub-categories of this tab's category, or the root
            // category list when the tab is not category-bound.
            var col1 = tab.CategoryId is not null
                ? childCategories.Where(c => c.ParentId == tab.CategoryId).ToList()
                : rootCategories.Take(6).ToList();

            if (col1.Count == 0) col1 = rootCategories.Take(6).ToList();

            foreach (var category in col1)
            {
                db.NavItems.Add(new NavItem
                {
                    MenuId = header.Id,
                    ParentId = tab.Id,
                    Label = category.Name,
                    CategoryId = category.Id,
                    ColumnIndex = 1,
                    DisplayOrder = order += 10,
                });
                added++;
            }

            // Column 2 - occasions.
            order = 0;
            foreach (var occasion in occasions.Take(6))
            {
                db.NavItems.Add(new NavItem
                {
                    MenuId = header.Id,
                    ParentId = tab.Id,
                    Label = occasion.Name,
                    OccasionId = occasion.Id,
                    ColumnIndex = 2,
                    DisplayOrder = order += 10,
                });
                added++;
            }

            // Column 3 - price bands.
            order = 0;
            foreach (var (label, query) in PriceBands)
            {
                db.NavItems.Add(new NavItem
                {
                    MenuId = header.Id,
                    ParentId = tab.Id,
                    Label = label,
                    Url = query,
                    ColumnIndex = 3,
                    DisplayOrder = order += 10,
                });
                added++;
            }
        }

        await db.SaveChangesAsync(ct);
        return added;
    }

    public async Task<object> SeedAsync(CancellationToken ct = default)
    {
        var settingsAdded = await SeedSettingsAsync(ct);

        var existingHeader = await db.NavMenus.FirstOrDefaultAsync(m => m.Code == "header", ct);
        if (existingHeader is not null)
        {
            // Menus exist, but the mega-menu pass may not have run yet.
            var megaAdded = await SeedMegaMenuAsync(existingHeader, ct);
            log.LogInformation("Navigation already seeded; added {Mega} mega-menu items", megaAdded);
            return new { menusCreated = 0, itemsCreated = megaAdded, settingsAdded, alreadySeeded = true };
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
            else
            {
                item.Url = url;
                WarnIfUnresolved(url);
            }

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
                else
                {
                    child.Url = urls[i];
                    WarnIfUnresolved(urls[i]);
                }

                db.NavItems.Add(child);
                items++;
            }
            await db.SaveChangesAsync(ct);
        }

        items += await SeedMegaMenuAsync(header, ct);

        log.LogInformation("Navigation seeded: 2 menus, {Items} items, {Settings} settings", items, settingsAdded);
        return new { menusCreated = 2, itemsCreated = items, settingsAdded, alreadySeeded = false };
    }

    /// <summary>
    /// Flags a /category/ or /occasion/ URL that matched no entity.
    ///
    /// The fallback to a literal URL is correct for real routes like /sale, but
    /// silently correct for a MISSPELLED category slug too — which is how a
    /// dead /category/party-wear link got seeded when the real slug was
    /// party-wear-lehengas. Entity references cannot rot; literal URLs can, so
    /// one that looks like it should have resolved is worth saying out loud.
    /// </summary>
    private void WarnIfUnresolved(string url)
    {
        if (url.StartsWith("/category/", StringComparison.Ordinal)
            || url.StartsWith("/occasion/", StringComparison.Ordinal))
        {
            log.LogWarning(
                "Nav link {Url} did not match any category or occasion and was stored as a literal URL. "
                + "Check the slug - this is how dead links get seeded.", url);
        }
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
