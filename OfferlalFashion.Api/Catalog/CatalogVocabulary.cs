using System.Globalization;
using System.Text.RegularExpressions;

namespace OfferlalFashion.Api.Catalog;

/// <summary>
/// Turns the catalogue's free-text merchandising copy into the small, curated
/// vocabularies a filter rail can actually be built from.
///
/// This exists because the source columns are not facetable as they stand:
///   - Fabric holds 31 distinct COMBINATIONS over ~16 base materials
///     ("Raw Silk with Net Dupatta", "Georgette over Silk").
///   - WorkDetails is 56 near-unique prose strings over 60 products
///     ("Hand Zardozi, Zari and Dabka embroidery with stone work").
/// Faceting on the raw values would produce a rail of mostly-one-item filters,
/// which is worse than no rail at all.
///
/// Both map to MULTI-VALUED facets, which is why ProductAttributeOptions is
/// keyed (product, attribute, option) rather than holding a single value.
///
/// Matching is deliberately conservative: an unrecognised string yields no
/// options rather than a guess, so a bad match never silently mis-files a
/// product. Unmatched values are reported by the projection so the vocabulary
/// can be extended deliberately.
/// </summary>
public static class CatalogVocabulary
{
    /// <summary>Attribute codes, referenced by the projection and the facet queries.</summary>
    public static class Codes
    {
        public const string Colour = "colour";
        public const string Fabric = "fabric";
        public const string Work = "work";

        // Size is FOUR attributes, not one.
        //
        // The catalogue mixes apparel (XS-XL), kids (2-3Y), footwear (36-41)
        // and dupatta lengths in metres (2.4). A single flat size facet would
        // offer "M", "38" and "6-7Y" in one list, where selecting any one is
        // meaningless for most of the catalogue. Splitting by scheme means a
        // category page only ever shows the scheme that applies to it.
        public const string SizeApparel = "size-apparel";
        public const string SizeKids = "size-kids";
        public const string SizeFootwear = "size-footwear";
        public const string SizeDupattaLength = "size-dupatta-length";
    }

    public static class Groups
    {
        public const string Material = "material";
        public const string Craft = "craft";
        public const string Fit = "fit";
    }

    /// <summary>
    /// Base materials, ordered longest-match-first so "Raw Silk" is preferred
    /// over a bare "Silk" match on the same string.
    /// </summary>
    private static readonly (string Slug, string Value, string[] Match)[] FabricVocabulary =
    [
        ("banarasi-silk",   "Banarasi Silk",   ["banarasi"]),
        ("kanjivaram-silk", "Kanjivaram Silk", ["kanjivaram"]),
        ("raw-silk",        "Raw Silk",        ["raw silk"]),
        ("pure-silk",       "Pure Silk",       ["pure silk"]),
        ("silk",            "Silk",            ["silk"]),
        ("net",             "Net",             ["net"]),
        ("georgette",       "Georgette",       ["georgette"]),
        ("chiffon",         "Chiffon",         ["chiffon"]),
        ("cotton",          "Cotton",          ["cotton"]),
        ("crepe",           "Crepe",           ["crepe"]),
        ("organza",         "Organza",         ["organza"]),
        ("velvet",          "Velvet",          ["velvet"]),
        ("leather",         "Leather",         ["leather"]),
        ("synthetic",       "Synthetic",       ["synthetic"]),

        // The catalogue already spans jewellery and footwear, so the material
        // attribute has to carry non-textile materials too.
        ("kundan",          "Kundan",          ["kundan"]),
        ("polki",           "Polki",           ["polki"]),
        ("pearl",           "Pearl",           ["pearl"]),
        ("gold-plating",    "Gold Plating",    ["gold plating"]),
        ("stone",           "Stone",           ["stone setting", "stone"]),
    ];

    /// <summary>Craft and embellishment techniques, extracted from WorkDetails prose.</summary>
    private static readonly (string Slug, string Value, string[] Match)[] WorkVocabulary =
    [
        ("zardozi",     "Zardozi",      ["zardozi"]),
        ("zari",        "Zari",         ["zari"]),
        ("dabka",       "Dabka",        ["dabka"]),
        ("kundan",      "Kundan",       ["kundan"]),
        ("polki",       "Polki",        ["polki"]),
        ("gota",        "Gota",         ["gota"]),
        ("mirror",      "Mirror Work",  ["mirror"]),
        ("sequin",      "Sequin",       ["sequin"]),
        ("pearl",       "Pearl",        ["pearl"]),
        ("resham",      "Resham",       ["resham"]),
        ("thread",      "Thread Work",  ["thread"]),
        ("stone",       "Stone Work",   ["stone", "crystal"]),
        ("marori",      "Marori",       ["marori"]),
        ("block-print", "Block Print",  ["block-print", "block print"]),
        ("handwoven",   "Handwoven",    ["handwoven", "hand-woven"]),
        ("temple",      "Temple Motif", ["temple"]),
    ];

    private static readonly Regex KidsSize = new(@"^\d{1,2}-\d{1,2}Y$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex FootwearSize = new(@"^\d{2}$", RegexOptions.Compiled);
    private static readonly Regex MetreLength = new(@"^\d+\.\d+$", RegexOptions.Compiled);

    private static readonly string[] ApparelSizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

    /// <summary>Base materials present in a Fabric string. Empty when nothing matches.</summary>
    public static IReadOnlyList<(string Slug, string Value)> ExtractFabrics(string? fabric) =>
        Extract(fabric, FabricVocabulary);

    /// <summary>Craft techniques present in a WorkDetails string. Empty when nothing matches.</summary>
    public static IReadOnlyList<(string Slug, string Value)> ExtractWork(string? work) =>
        Extract(work, WorkVocabulary);

    private static IReadOnlyList<(string Slug, string Value)> Extract(
        string? source,
        (string Slug, string Value, string[] Match)[] vocabulary)
    {
        if (string.IsNullOrWhiteSpace(source)) return [];

        var haystack = source.ToLowerInvariant();
        var found = new List<(string, string)>();

        foreach (var (slug, value, needles) in vocabulary)
        {
            if (needles.Any(n => haystack.Contains(n, StringComparison.Ordinal)))
            {
                found.Add((slug, value));
            }
        }

        return found;
    }

    /// <summary>
    /// Which size attribute a raw size string belongs to. Returns null for
    /// "Custom", which is a made-to-measure signal rather than a size and is
    /// surfaced as its own boolean filter instead.
    /// </summary>
    public static string? ClassifySize(string? size)
    {
        if (string.IsNullOrWhiteSpace(size)) return null;
        var s = size.Trim();

        if (s.Equals("Custom", StringComparison.OrdinalIgnoreCase)) return null;
        if (KidsSize.IsMatch(s)) return Codes.SizeKids;
        if (FootwearSize.IsMatch(s)) return Codes.SizeFootwear;

        // A decimal is a dupatta/fabric length in metres. Checked after
        // footwear so that "38" is never read as 38 metres.
        if (MetreLength.IsMatch(s)) return Codes.SizeDupattaLength;

        return Codes.SizeApparel;
    }

    /// <summary>
    /// Sort position for a size option. Apparel follows garment order rather
    /// than alphabetical, which would render L, M, S, XL, XS.
    /// </summary>
    public static int SizeSortOrder(string attributeCode, string size)
    {
        if (attributeCode == Codes.SizeApparel)
        {
            var index = Array.FindIndex(ApparelSizeOrder, s => s.Equals(size, StringComparison.OrdinalIgnoreCase));
            return index >= 0 ? index : ApparelSizeOrder.Length;
        }

        // Kids "2-3Y" sorts on its leading number; footwear and lengths sort numerically.
        var leading = new string(size.TakeWhile(c => char.IsDigit(c) || c == '.').ToArray());
        return double.TryParse(leading, NumberStyles.Any, CultureInfo.InvariantCulture, out var n)
            ? (int)Math.Round(n * 10)
            : int.MaxValue;
    }

    /// <summary>URL-safe facet key for a free-text value.</summary>
    public static string Slugify(string value)
    {
        var lower = value.Trim().ToLowerInvariant();
        var slug = Regex.Replace(lower, "[^a-z0-9]+", "-").Trim('-');
        return string.IsNullOrEmpty(slug) ? "unknown" : slug;
    }
}
