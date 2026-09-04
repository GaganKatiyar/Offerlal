using System.Text.Json;
using OfferlalFashion.Api.Catalog;

namespace OfferlalFashion.Api.Content;

/// <summary>
/// Turns a stored ProductRule definition into a ProductQuery.
///
/// The definition is a CONSTRAINED SHAPE, never SQL and never an expression
/// language. An admin form that could store executable query text would be a
/// remote-code-execution hole reachable from a CMS screen, and it is far
/// cheaper to refuse that now than to retrofit a sandbox later.
///
/// Unknown keys are ignored rather than rejected, so a rule written against a
/// newer shape degrades to a broader result set instead of emptying a homepage
/// rail. Every payload carries "v" so the contract can change deliberately.
/// </summary>
public static class ProductRuleTranslator
{
    /// <summary>Flags the rule language understands. Anything else is ignored.</summary>
    private static readonly string[] KnownFlags = ["isNewArrival", "isBestseller", "isFeatured", "onSale"];

    /// <summary>Sorts the rule language understands, mapped to the catalogue's own.</summary>
    private static readonly string[] KnownSorts =
        ["recommended", "newest", "bestselling", "price-asc", "price-desc", "rating"];

    public static ProductQuery Translate(string definitionJson, int take)
    {
        var query = new ProductQuery { Page = 1, PageSize = Math.Clamp(take, 1, 48) };

        JsonElement root;
        try
        {
            root = JsonDocument.Parse(definitionJson).RootElement;
        }
        catch (JsonException)
        {
            // A broken rule falls back to a plain recommended query rather than
            // taking the page down.
            return query;
        }

        if (root.ValueKind != JsonValueKind.Object) return query;

        string? categoryId = null;
        string? occasionId = null;
        decimal? priceMin = null;
        decimal? priceMax = null;
        var inStockOnly = false;
        var newArrivals = false;
        var bestseller = false;
        var featured = false;
        var onSale = false;
        var sort = "recommended";
        var facets = new Dictionary<string, string[]>();

        foreach (var property in root.EnumerateObject())
        {
            switch (property.Name)
            {
                case "categoryId":
                    categoryId = property.Value.GetString();
                    break;
                case "occasionId":
                    occasionId = property.Value.GetString();
                    break;
                case "priceMin":
                    if (property.Value.TryGetDecimal(out var min)) priceMin = min;
                    break;
                case "priceMax":
                    if (property.Value.TryGetDecimal(out var max)) priceMax = max;
                    break;
                case "inStockOnly":
                    inStockOnly = property.Value.ValueKind == JsonValueKind.True;
                    break;
                case "sort":
                    var requested = property.Value.GetString();
                    if (requested is not null && KnownSorts.Contains(requested)) sort = requested;
                    break;
                case "take":
                    if (property.Value.TryGetInt32(out var n)) query = query with { PageSize = Math.Clamp(n, 1, 48) };
                    break;
                case "flags":
                    foreach (var flag in ReadStringArray(property.Value).Where(KnownFlags.Contains))
                    {
                        if (flag == "isNewArrival") newArrivals = true;
                        if (flag == "isBestseller") bestseller = true;
                        if (flag == "isFeatured") featured = true;
                        if (flag == "onSale") onSale = true;
                    }
                    break;
                case "facets":
                    if (property.Value.ValueKind == JsonValueKind.Object)
                    {
                        foreach (var facet in property.Value.EnumerateObject())
                        {
                            var values = ReadStringArray(facet.Value);
                            if (values.Length > 0) facets[facet.Name] = values;
                        }
                    }
                    break;
            }
        }

        // isBestseller and isFeatured have no dedicated filter on ProductQuery;
        // they are expressed through the sort, which is what the storefront's
        // own "Best Selling" option does.
        if (bestseller && sort == "recommended") sort = "bestselling";
        if (featured && sort == "recommended") sort = "recommended";

        return query with
        {
            CategoryId = categoryId,
            OccasionId = occasionId,
            PriceMin = priceMin,
            PriceMax = priceMax,
            InStockOnly = inStockOnly,
            NewArrivalsOnly = newArrivals,
            OnSaleOnly = onSale,
            Sort = sort,
            Facets = facets,
        };
    }

    private static string[] ReadStringArray(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Array) return [];
        return [.. element.EnumerateArray()
            .Where(e => e.ValueKind == JsonValueKind.String)
            .Select(e => e.GetString()!)
            .Where(s => !string.IsNullOrWhiteSpace(s))];
    }
}
