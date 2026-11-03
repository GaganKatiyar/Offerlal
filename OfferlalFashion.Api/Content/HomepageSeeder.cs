using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Content;

/// <summary>
/// Captures the homepage exactly as it is hardcoded today, as CMS data.
///
/// Deliberately reproduces the current page rather than improving it. This
/// change is about WHERE the content lives, not what it says; changing both at
/// once would make it impossible to tell a migration bug from a redesign
/// decision. The homepage should look identical after this runs — and then be
/// editable without a deploy.
///
/// Every eyebrow and heading below is copied verbatim from home.html, and the
/// order matches the order the sections appeared in that template.
/// </summary>
public sealed class HomepageSeeder(
    OfferlalFashionDbContext db,
    OfferlalFashion.Api.Media.MediaService media,
    ILogger<HomepageSeeder> log)
{
    public const string HomeKey = "home";

    /// <summary>
    /// Section types the frontend can render. A row here plus a component in
    /// the frontend registry is all a new type needs.
    /// </summary>
    private static readonly (string Code, string Name, string? ItemKind, int? MaxItems, int Order)[] Types =
    [
        ("hero-carousel",   "Hero Carousel",    SectionItemKind.Banner,   6,    10),
        ("category-rail",   "Category Rail",    SectionItemKind.Category, 12,   20),
        ("occasion-rail",   "Occasion Rail",    SectionItemKind.Occasion, 12,   30),
        ("product-rail",    "Product Rail",     SectionItemKind.Product,  24,   40),
        ("editorial-split", "Editorial Banner", SectionItemKind.Editorial, 2,   50),
        ("budget-rail",     "Budget Tiles",     SectionItemKind.Link,     8,    60),
        ("ugc-grid",        "Styled By You",    SectionItemKind.Editorial, 12,  70),
        ("trust-strip",     "Trust Strip",      SectionItemKind.Trust,    6,    80),
        ("testimonial-rail","Testimonials",     null,                     null, 90),
        ("promo-strip",     "Promo Strip",      SectionItemKind.Banner,   1,    100),
        ("app-download",    "App Download",     SectionItemKind.Link,     4,    110),
    ];

    /// <summary>
    /// The ten sections of the current homepage, in template order.
    /// ConfigJson carries only what is genuinely type-specific.
    /// </summary>
    private static readonly (string Type, string Eyebrow, string Heading, string Config)[] Sections =
    [
        ("hero-carousel",    "",                            "",                           "{\"v\":1}"),
        ("promo-strip",      "",                            "Free shipping over 2,999",   "{\"v\":1}"),
        ("occasion-rail",    "Curated For You",             "Shop by Occasion",           "{\"v\":1}"),
        ("category-rail",    "The Edit",                    "Shop by Category",           "{\"v\":1}"),
        ("product-rail",     "Just In",                     "New Arrivals",               "{\"v\":1,\"rule\":\"new-arrivals\"}"),
        ("editorial-split",  "Editorial",                   "The Bridal Edit",            "{\"v\":1}"),
        ("product-rail",     "Loved By Many",               "Best Sellers",               "{\"v\":1,\"rule\":\"bestsellers\"}"),
        ("budget-rail",      "Every Budget, Every Occasion","Shop by Budget",             "{\"v\":1}"),
        ("product-rail",     "Shop The Edit",               "Complete Your Wedding Look", "{\"v\":1,\"pinned\":true}"),
        ("ugc-grid",         "Real Brides, Real Moments",   "Styled By You",              "{\"v\":1}"),
        ("trust-strip",      "",                            "",                           "{\"v\":1}"),
        ("testimonial-rail", "In Their Words",              "Customer Reviews",           "{\"v\":1}"),
    ];

    /// <summary>
    /// Product rules replacing the hardcoded curation. "complete-the-look" is
    /// the COMPLETE_LOOK_PRODUCT_IDS constant, now pinned rows rather than an
    /// array in a component.
    /// </summary>
    private static readonly (string Name, string Definition, int Max)[] Rules =
    [
        ("new-arrivals", "{\"v\":1,\"flags\":[\"isNewArrival\"],\"sort\":\"newest\",\"take\":8}", 8),
        ("bestsellers",  "{\"v\":1,\"flags\":[\"isBestseller\"],\"sort\":\"bestselling\",\"take\":8}", 8),
    ];

    /// <summary>
    /// The four literal &lt;div&gt;s in the Trust section of home.html, copied
    /// exactly — including the glyphs, which were inline text in the markup.
    /// (An earlier pass here transcribed the FOOTER's trust strip by mistake,
    /// which would have silently rewritten the homepage copy during a migration
    /// that is supposed to change nothing visible.)
    /// </summary>
    private static readonly (string Icon, string Title, string Caption)[] TrustBadges =
    [
        ("✦", "Authentic Quality", "Carefully selected fabrics and craftsmanship."),
        ("⇄", "Easy Exchange",     "Simple exchange process."),
        ("🔒", "Secure Payments", "100% secure checkout."),
        ("⚡", "Fast Delivery",     "Reliable delivery across India."),
    ];

    /// <summary>
    /// STYLED_BY_YOU, verbatim. The raw Pexels image ids become MediaAssets so
    /// these photos live in the library like every other image rather than as
    /// integers embedded in a component.
    /// </summary>
    private static readonly (string Customer, string City, string Outfit, string Slug, long ImageId)[] StyledByYou =
    [
        ("Ananya S.",  "Delhi",     "Maroon Zari Embroidered Bridal Lehenga", "maroon-zari-embroidered-bridal-lehenga", 13661786),
        ("Priya R.",   "Hyderabad", "Red Zardozi Bridal Lehenga Set",         "red-zardozi-bridal-lehenga",            27212066),
        ("Riya B.",    "Jaipur",    "Peach Mirror Work Party Lehenga",        "peach-mirror-work-party-lehenga",        8752674),
        ("Anjali G.",  "Lucknow",   "Mustard Gota Patti Party Lehenga",       "mustard-gota-patti-party-lehenga",      30918414),
        ("Tanya C.",   "Delhi",     "Coral Sequin Party Lehenga",             "coral-sequin-party-lehenga",             3680632),
        ("Kritika J.", "Pune",      "Yellow Mirror Work Gharara Set",         "yellow-mirror-work-gharara-set",        20614154),
    ];

    /// <summary>
    /// Hero slides, drawn from category imagery already in the media library.
    ///
    /// Placeholders on purpose: real wide banner artwork is a design job the
    /// owner supplies. Using catalogue photography means the layout can be
    /// judged immediately rather than staying empty until artwork exists, and
    /// each slide is a normal PageSectionItem so swapping the image later is a
    /// data change.
    /// </summary>
    private static readonly (string CategorySlug, string Badge, string Title, string Caption, string Cta, string Link)[] HeroSlides =
    [
        ("bridal-lehengas", "The Bridal Edit", "Heirloom Bridal Lehengas",
            "Hand-worked zardozi, kundan and gota, made to your measurements.",
            "Shop Bridal", "/category/bridal-lehengas"),
        ("party-wear-lehengas", "New Season", "Party Wear, Reimagined",
            "Lighter drapes and modern silhouettes for every celebration.",
            "Shop Party Wear", "/category/party-wear-lehengas"),
        ("bridal-jewellery", "Complete The Look", "Kundan & Polki Jewellery",
            "Temple, choker and maang tikka sets to finish the ensemble.",
            "Shop Jewellery", "/category/bridal-jewellery"),
        ("sarees", "Timeless", "Handwoven Sarees",
            "Banarasi, Kanjivaram and organza, woven to last generations.",
            "Shop Sarees", "/sale"),
    ];

    /// <summary>COMPLETE_LOOK_PRODUCT_IDS, verbatim.</summary>
    private static readonly string[] CompleteTheLook =
        ["prod-001", "prod-049", "prod-056", "prod-058", "prod-060"];

    public async Task<object> SeedAsync(CancellationToken ct = default)
    {
        await EnsureSectionTypesAsync(ct);
        await EnsureRulesAsync(ct);

        var page = await db.ContentPages.Include(p => p.Sections)
            .FirstOrDefaultAsync(p => p.Key == HomeKey, ct);

        if (page is null)
        {
            page = new ContentPage { Key = HomeKey, Name = "Homepage" };
            db.ContentPages.Add(page);
            await db.SaveChangesAsync(ct);
        }

        // Idempotent: if the page already has sections, leave them alone. This
        // must never overwrite edits made in admin.
        if (page.Sections.Count > 0)
        {
            // The page is seeded, but a section type added after the fact would
            // otherwise never appear on it. Adding just the missing one keeps
            // the guarantee that matters - existing sections and any admin
            // edits to them are untouched.
            var added = await EnsureAppDownloadAsync(page, ct);
            log.LogInformation(
                "Homepage already has {Count} sections; seeder added {Added}", page.Sections.Count, added);
            return new { pageId = page.Id, sectionsCreated = added, alreadySeeded = true };
        }

        var rules = await db.ProductRules.ToDictionaryAsync(r => r.Name, ct);
        var order = 0;
        var created = 0;

        foreach (var (type, eyebrow, heading, config) in Sections)
        {
            var section = new PageSection
            {
                PageId = page.Id,
                SectionTypeCode = type,
                Eyebrow = string.IsNullOrEmpty(eyebrow) ? null : eyebrow,
                Heading = string.IsNullOrEmpty(heading) ? null : heading,
                DisplayOrder = order += 10,
                IsActive = true,
                ConfigJson = config,
            };

            if (config.Contains("\"rule\":\"new-arrivals\"") && rules.TryGetValue("new-arrivals", out var na))
                section.ProductRuleId = na.Id;
            if (config.Contains("\"rule\":\"bestsellers\"") && rules.TryGetValue("bestsellers", out var bs))
                section.ProductRuleId = bs.Id;

            db.PageSections.Add(section);
            await db.SaveChangesAsync(ct);
            created++;

            if (type == "hero-carousel")
            {
                var i = 0;
                foreach (var (slug, badge, title, caption, cta, link) in HeroSlides)
                {
                    // Reuses the category's own hero asset, so a slide never
                    // references an image the library does not already hold.
                    var category = await db.Categories
                        .FirstOrDefaultAsync(c => c.Slug == slug, ct);
                    if (category?.HeroImageAssetId is null) continue;

                    db.PageSectionItems.Add(new PageSectionItem
                    {
                        SectionId = section.Id,
                        DisplayOrder = i += 10,
                        ItemKind = SectionItemKind.Banner,
                        BadgeText = badge,
                        Title = title,
                        Subtitle = cta,
                        Caption = caption,
                        LinkUrl = link,
                        MediaAssetId = category.HeroImageAssetId,
                    });
                }
            }
            else if (type == "promo-strip")
            {
                section.Subheading = "Easy exchange · Secure payments · Delivered across India";
                section.CtaLabel = "Shop the sale";
                section.CtaUrl = "/sale";
            }
            else if (type == "trust-strip")
            {
                var i = 0;
                foreach (var (icon, title, caption) in TrustBadges)
                {
                    db.PageSectionItems.Add(new PageSectionItem
                    {
                        SectionId = section.Id,
                        DisplayOrder = i += 10,
                        ItemKind = SectionItemKind.Trust,
                        BadgeText = icon,
                        Title = title,
                        Caption = caption,
                    });
                }
            }
            else if (type == "ugc-grid")
            {
                var i = 0;
                foreach (var (customer, city, outfit, slug, imageId) in StyledByYou)
                {
                    var url = $"https://images.pexels.com/photos/{imageId}/pexels-photo-{imageId}.jpeg?auto=compress&cs=tinysrgb&w=1200";
                    var asset = await media.RegisterExternalAsync(url, "ugc", $"{customer} wearing {outfit}", ct);
                    await db.SaveChangesAsync(ct);

                    db.PageSectionItems.Add(new PageSectionItem
                    {
                        SectionId = section.Id,
                        DisplayOrder = i += 10,
                        ItemKind = SectionItemKind.Editorial,
                        Title = customer,
                        Subtitle = city,
                        Caption = outfit,
                        LinkUrl = $"/product/{slug}",
                        MediaAssetId = asset.Id,
                    });
                }
            }
            else if (heading == "Complete Your Wedding Look")
            {
                // Manual pins, in the order the constant listed them. Products
                // that no longer exist are skipped rather than failing the seed.
                var existing = await db.Products
                    .Where(p => CompleteTheLook.Contains(p.Id))
                    .Select(p => p.Id)
                    .ToListAsync(ct);

                var i = 0;
                foreach (var id in CompleteTheLook.Where(existing.Contains))
                {
                    db.PageSectionItems.Add(new PageSectionItem
                    {
                        SectionId = section.Id,
                        DisplayOrder = i += 10,
                        ItemKind = SectionItemKind.Product,
                        ProductId = id,
                    });
                }
            }

            await db.SaveChangesAsync(ct);
        }

        log.LogInformation("Homepage seeded: {Created} sections", created);
        return new { pageId = page.Id, sectionsCreated = created, alreadySeeded = false };
    }

    private async Task EnsureSectionTypesAsync(CancellationToken ct)
    {
        var existing = await db.SectionTypes.Select(t => t.Code).ToListAsync(ct);
        foreach (var (code, name, itemKind, maxItems, order) in Types)
        {
            if (existing.Contains(code)) continue;
            db.SectionTypes.Add(new SectionType
            {
                Code = code,
                Name = name,
                ItemKind = itemKind,
                MaxItems = maxItems,
                DisplayOrder = order,
                IsActive = true,
            });
        }
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Appends the app-download banner if the page does not already have one.
    ///
    /// Separate from the main seed because that runs only on an empty page, and
    /// this section type was added long after the homepage was first seeded.
    /// Keyed on the section type rather than a flag, so running twice is safe.
    /// </summary>
    private async Task<int> EnsureAppDownloadAsync(ContentPage page, CancellationToken ct)
    {
        if (page.Sections.Any(x => x.SectionTypeCode == "app-download")) return 0;

        var lastOrder = page.Sections.Count == 0 ? 0 : page.Sections.Max(x => x.DisplayOrder);

        var section = new PageSection
        {
            PageId = page.Id,
            SectionTypeCode = "app-download",
            Heading = "More to love on the app",
            Subheading = "Early access to new drops, order tracking and your saved measurements — wherever you are.",
            DisplayOrder = lastOrder + 10,
            IsActive = true,
            ConfigJson = "{\"v\":1}",
        };

        db.PageSections.Add(section);
        await db.SaveChangesAsync(ct);

        // The store links are items rather than ConfigJson so they can be
        // retargeted from admin. They are deliberately empty: Offerlal is not
        // published to either store yet, and inventing a listing URL would ship
        // a button that 404s. The renderer hides a link with no URL.
        var stores = new[]
        {
            ("Google Play", "Android", ""),
            ("App Store", "iPhone", ""),
        };

        var i = 0;
        foreach (var (title, subtitle, url) in stores)
        {
            db.PageSectionItems.Add(new PageSectionItem
            {
                SectionId = section.Id,
                DisplayOrder = i += 10,
                ItemKind = SectionItemKind.Link,
                Title = title,
                Subtitle = subtitle,
                LinkUrl = string.IsNullOrEmpty(url) ? null : url,
                IsActive = true,
            });
        }

        await db.SaveChangesAsync(ct);
        return 1;
    }

    private async Task EnsureRulesAsync(CancellationToken ct)
    {
        var existing = await db.ProductRules.Select(r => r.Name).ToListAsync(ct);
        foreach (var (name, definition, max) in Rules)
        {
            if (existing.Contains(name)) continue;
            db.ProductRules.Add(new ProductRule { Name = name, DefinitionJson = definition, MaxItems = max });
        }
        await db.SaveChangesAsync(ct);
    }
}
