using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Catalog;

/// <summary>Outcome of a projection run, for logging and the admin endpoint.</summary>
public sealed record ProjectionReport
{
    public int ProductsProcessed { get; init; }
    public int AttributesCreated { get; init; }
    public int OptionsCreated { get; init; }
    public int OptionLinksWritten { get; init; }
    public int VariantsLinked { get; init; }
    public int SkusLinked { get; init; }

    /// <summary>
    /// Source values the vocabulary did not recognise. These are NOT errors —
    /// they are the queue of terms to add to CatalogVocabulary deliberately.
    /// Silently guessing at them would mis-file products.
    /// </summary>
    public IReadOnlyList<string> UnmatchedFabrics { get; init; } = [];
    public IReadOnlyList<string> UnmatchedWork { get; init; } = [];
}

/// <summary>
/// Rebuilds the facet projection from the authoritative catalogue tables.
///
/// Colour and size stay authoritative on ProductVariants and ProductSkus;
/// fabric and work stay authoritative as merchandising prose on Products. This
/// service derives the filterable representation from them, so the PLP has
/// exactly ONE query shape for every attribute rather than a special case per
/// column. Nothing here is a source of truth — a full rebuild is always safe.
///
/// Run on demand (admin endpoint) and, later, on product save.
/// </summary>
public sealed class AttributeProjectionService(OfferlalFashionDbContext db, ILogger<AttributeProjectionService> log)
{
    /// <summary>Attribute definitions this projection owns, created if absent.</summary>
    private static readonly (string Code, string Name, string Group, string Scope, int Order)[] ManagedAttributes =
    [
        (CatalogVocabulary.Codes.Colour,            "Colour",         CatalogVocabulary.Groups.Material, AttributeScope.Variant, 10),
        (CatalogVocabulary.Codes.Fabric,            "Fabric",         CatalogVocabulary.Groups.Material, AttributeScope.Product, 20),
        (CatalogVocabulary.Codes.Work,              "Work",           CatalogVocabulary.Groups.Craft,    AttributeScope.Product, 30),
        (CatalogVocabulary.Codes.SizeApparel,       "Size",           CatalogVocabulary.Groups.Fit,      AttributeScope.Sku,     40),
        (CatalogVocabulary.Codes.SizeKids,          "Age",            CatalogVocabulary.Groups.Fit,      AttributeScope.Sku,     41),
        (CatalogVocabulary.Codes.SizeFootwear,      "Shoe Size",      CatalogVocabulary.Groups.Fit,      AttributeScope.Sku,     42),
        (CatalogVocabulary.Codes.SizeDupattaLength, "Length (m)",     CatalogVocabulary.Groups.Fit,      AttributeScope.Sku,     43),
    ];

    private static readonly (string Code, string Name, int Order)[] ManagedGroups =
    [
        (CatalogVocabulary.Groups.Material, "Fabric & Material", 10),
        (CatalogVocabulary.Groups.Craft,    "Craft & Work",      20),
        (CatalogVocabulary.Groups.Fit,      "Size & Fit",        30),
    ];

    public async Task<ProjectionReport> RebuildAllAsync(CancellationToken ct = default)
    {
        await EnsureAttributesAsync(ct);

        var attributes = await db.CatalogAttributes.ToDictionaryAsync(a => a.Code, ct);
        var options = await db.AttributeOptions.ToListAsync(ct);

        // (attributeId, slug) -> option, so an option is created at most once.
        var optionIndex = options.ToDictionary(o => (o.AttributeId, o.Slug));
        var optionsCreatedBefore = options.Count;

        var products = await db.Products
            .Include(p => p.ProductVariants).ThenInclude(v => v.ProductSkus)
            .ToListAsync(ct);

        var unmatchedFabrics = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        var unmatchedWork = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);

        // Links are rebuilt wholesale rather than diffed. At this catalogue size
        // that is far simpler than reconciling, and the table is a pure
        // projection so there is nothing to preserve.
        db.ProductAttributeOptions.RemoveRange(db.ProductAttributeOptions);
        await db.SaveChangesAsync(ct);

        // Holds OBJECT REFERENCES, not ids.
        //
        // A newly created AttributeOption has Id = 0 until SaveChanges assigns
        // the identity value. Keying on Id here would collapse every new option
        // onto 0 and then fail the FK. Ids are read once, after the save below.
        var links = new List<(string ProductId, int AttributeId, AttributeOption Option)>();
        var variantsLinked = 0;
        var skusLinked = 0;

        foreach (var product in products)
        {
            // --- Colour, from the variants -----------------------------------
            var colourAttr = attributes[CatalogVocabulary.Codes.Colour];
            foreach (var variant in product.ProductVariants)
            {
                if (string.IsNullOrWhiteSpace(variant.Color)) continue;

                var slug = CatalogVocabulary.Slugify(variant.Color);
                var option = GetOrCreateOption(optionIndex, colourAttr.Id, slug, variant.Color, variant.ColorHex, 0);

                // The FK on the variant is what a future admin edit writes
                // directly; the link row is what the facet query reads.
                variant.ColorOption = option;
                variantsLinked++;
                links.Add((product.Id, colourAttr.Id, option));

                // --- Size, from the SKUs -------------------------------------
                foreach (var sku in variant.ProductSkus)
                {
                    var sizeCode = CatalogVocabulary.ClassifySize(sku.Size);
                    if (sizeCode is null) continue; // "Custom" is a flag, not a size

                    var sizeAttr = attributes[sizeCode];
                    var sizeSlug = CatalogVocabulary.Slugify(sku.Size);
                    var sizeOption = GetOrCreateOption(
                        optionIndex, sizeAttr.Id, sizeSlug, sku.Size, null,
                        CatalogVocabulary.SizeSortOrder(sizeCode, sku.Size));

                    sku.SizeOption = sizeOption;
                    skusLinked++;
                    links.Add((product.Id, sizeAttr.Id, sizeOption));
                }
            }

            // --- Fabric, extracted from prose --------------------------------
            var fabricAttr = attributes[CatalogVocabulary.Codes.Fabric];
            var fabrics = CatalogVocabulary.ExtractFabrics(product.Fabric);
            if (fabrics.Count == 0 && !string.IsNullOrWhiteSpace(product.Fabric))
            {
                unmatchedFabrics.Add(product.Fabric);
            }
            foreach (var (slug, value) in fabrics)
            {
                var option = GetOrCreateOption(optionIndex, fabricAttr.Id, slug, value, null, 0);
                links.Add((product.Id, fabricAttr.Id, option));
            }

            // --- Work, extracted from prose ----------------------------------
            var workAttr = attributes[CatalogVocabulary.Codes.Work];
            var works = CatalogVocabulary.ExtractWork(product.WorkDetails);
            if (works.Count == 0 && !string.IsNullOrWhiteSpace(product.WorkDetails))
            {
                unmatchedWork.Add(product.WorkDetails);
            }
            foreach (var (slug, value) in works)
            {
                var option = GetOrCreateOption(optionIndex, workAttr.Id, slug, value, null, 0);
                links.Add((product.Id, workAttr.Id, option));
            }
        }

        // Options must exist before the link rows that reference them; this is
        // also where the identity values above get assigned.
        await db.SaveChangesAsync(ct);

        // Dedupe only now that every option has a real id. A product legitimately
        // reaches the same option more than once (two variants sharing a colour,
        // "Silk with Net Overlay" matching silk twice), and the table's PK is
        // (ProductId, AttributeId, OptionId).
        var rows = links
            .Select(l => (l.ProductId, l.AttributeId, OptionId: l.Option.Id))
            .Distinct()
            .ToList();

        db.ProductAttributeOptions.AddRange(rows.Select(r => new ProductAttributeOption
        {
            ProductId = r.ProductId,
            AttributeId = r.AttributeId,
            OptionId = r.OptionId,
        }));
        await db.SaveChangesAsync(ct);

        var report = new ProjectionReport
        {
            ProductsProcessed = products.Count,
            AttributesCreated = attributes.Count,
            OptionsCreated = optionIndex.Count - optionsCreatedBefore,
            OptionLinksWritten = rows.Count,
            VariantsLinked = variantsLinked,
            SkusLinked = skusLinked,
            UnmatchedFabrics = [.. unmatchedFabrics],
            UnmatchedWork = [.. unmatchedWork],
        };

        log.LogInformation(
            "Attribute projection rebuilt: {Products} products, {Links} option links, {Unmatched} unmatched source values",
            report.ProductsProcessed,
            report.OptionLinksWritten,
            report.UnmatchedFabrics.Count + report.UnmatchedWork.Count);

        return report;
    }

    private AttributeOption GetOrCreateOption(
        Dictionary<(int, string), AttributeOption> index,
        int attributeId,
        string slug,
        string value,
        string? colorHex,
        int displayOrder)
    {
        if (index.TryGetValue((attributeId, slug), out var existing))
        {
            // Keep the swatch fresh if the catalogue gained one later.
            if (colorHex is not null && existing.ColorHex != colorHex) existing.ColorHex = colorHex;
            return existing;
        }

        var option = new AttributeOption
        {
            AttributeId = attributeId,
            Slug = slug,
            Value = value,
            ColorHex = NormaliseHex(colorHex),
            DisplayOrder = displayOrder,
            IsActive = true,
        };

        db.AttributeOptions.Add(option);
        index[(attributeId, slug)] = option;
        return option;
    }

    /// <summary>The column is char(7), so anything else would be silently padded or rejected.</summary>
    private static string? NormaliseHex(string? hex)
    {
        if (string.IsNullOrWhiteSpace(hex)) return null;
        var h = hex.Trim();
        if (!h.StartsWith('#')) h = "#" + h;
        return h.Length == 7 ? h : null;
    }

    private async Task EnsureAttributesAsync(CancellationToken ct)
    {
        var groups = await db.AttributeGroups.ToDictionaryAsync(g => g.Code, ct);
        foreach (var (code, name, order) in ManagedGroups)
        {
            if (groups.ContainsKey(code)) continue;
            var group = new AttributeGroup { Code = code, Name = name, DisplayOrder = order };
            db.AttributeGroups.Add(group);
            groups[code] = group;
        }
        await db.SaveChangesAsync(ct);

        var existing = await db.CatalogAttributes.Select(a => a.Code).ToListAsync(ct);
        foreach (var (code, name, groupCode, scope, order) in ManagedAttributes)
        {
            if (existing.Contains(code)) continue;

            db.CatalogAttributes.Add(new CatalogAttribute
            {
                Code = code,
                Name = name,
                GroupId = groups[groupCode].Id,
                ValueKind = AttributeValueKind.Option,
                InputType = code == CatalogVocabulary.Codes.Colour ? "swatch" : "multiselect",
                Scope = scope,
                IsFacetable = true,
                IsSearchable = code is CatalogVocabulary.Codes.Fabric or CatalogVocabulary.Codes.Work,
                ShowOnPdp = true,
                DisplayOrder = order,
            });
        }
        await db.SaveChangesAsync(ct);
    }
}
