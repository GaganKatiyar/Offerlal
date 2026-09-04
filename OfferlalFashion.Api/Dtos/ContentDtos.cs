using System.Text.Json;

namespace OfferlalFashion.Api.Dtos;

public sealed record ContentPageDto
{
    public string Key { get; init; } = "";
    public string Name { get; init; } = "";
    public IReadOnlyList<ContentSectionDto> Sections { get; init; } = [];
}

public sealed record ContentSectionDto
{
    public int Id { get; init; }

    /// <summary>
    /// Section type code. The frontend maps this to a component; an UNKNOWN
    /// code renders nothing rather than white-screening, so a new type can be
    /// added in admin before the frontend supports it.
    /// </summary>
    public string Type { get; init; } = "";

    public string? Eyebrow { get; init; }
    public string? Heading { get; init; }
    public string? Subheading { get; init; }
    public string? CtaLabel { get; init; }
    public string? CtaUrl { get; init; }

    /// <summary>Type-specific knobs, validated on write.</summary>
    public IReadOnlyDictionary<string, JsonElement> Config { get; init; } = new Dictionary<string, JsonElement>();

    /// <summary>Typed child rows: banners, tiles, trust badges, editorial cards.</summary>
    public IReadOnlyList<ContentItemDto> Items { get; init; } = [];

    /// <summary>Resolved products for rails: pinned first, then rule backfill.</summary>
    public IReadOnlyList<ProductCardDto> Products { get; init; } = [];
}

public sealed record ContentItemDto
{
    public int Id { get; init; }
    public string Kind { get; init; } = "";
    public string? Title { get; init; }
    public string? Subtitle { get; init; }
    public string? Caption { get; init; }
    public string? BadgeText { get; init; }
    public string? LinkUrl { get; init; }
    public string? ImageUrl { get; init; }
    public string? ImageAlt { get; init; }

    /// <summary>Separate mobile crop; a desktop banner reframed is usually wrong, not just smaller.</summary>
    public string? MobileImageUrl { get; init; }

    public string? ProductId { get; init; }
    public string? CategoryId { get; init; }
    public string? OccasionId { get; init; }
}

// ---------------------------------------------------------------------------
// Admin-side DTOs.
//
// Separate from the public ones on purpose: admin sees inactive and scheduled
// sections, row versions and item counts, none of which the storefront should
// ever receive.
// ---------------------------------------------------------------------------

public sealed record AdminPageDto
{
    public int Id { get; init; }
    public string Key { get; init; } = "";
    public string Name { get; init; } = "";
    public int? PublishedRevisionId { get; init; }
    public IReadOnlyList<AdminSectionDto> Sections { get; init; } = [];
    public IReadOnlyList<SectionTypeDto> SectionTypes { get; init; } = [];
    public IReadOnlyList<ProductRuleDto> ProductRules { get; init; } = [];
}

public sealed record AdminSectionDto
{
    public int Id { get; init; }
    public string Type { get; init; } = "";
    public string? Eyebrow { get; init; }
    public string? Heading { get; init; }
    public string? Subheading { get; init; }
    public string? CtaLabel { get; init; }
    public string? CtaUrl { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsActive { get; init; }
    public DateTime? StartsAtUtc { get; init; }
    public DateTime? EndsAtUtc { get; init; }
    public int? ProductRuleId { get; init; }

    /// <summary>Round-tripped by the editor so a concurrent save conflicts rather than clobbers.</summary>
    public string? RowVersion { get; init; }

    public int ItemCount { get; init; }
}

public sealed record SectionTypeDto
{
    public string Code { get; init; } = "";
    public string Name { get; init; } = "";
    public string? ItemKind { get; init; }
    public int? MaxItems { get; init; }
}

public sealed record ProductRuleDto
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public int MaxItems { get; init; }
}

public sealed record RevisionDto
{
    public int Id { get; init; }
    public DateTime PublishedAtUtc { get; init; }
    public string? Note { get; init; }
    public bool IsCurrent { get; init; }
}

/// <summary>One navigation entry, with its children nested.</summary>
public sealed record NavItemDto
{
    public int Id { get; init; }
    public string Label { get; init; } = "";
    public string Url { get; init; } = "#";
    public string? IconName { get; init; }
    public string? ImageUrl { get; init; }
    public byte ColumnIndex { get; init; }
    public bool IsHighlighted { get; init; }
    public string? BadgeText { get; init; }
    public IReadOnlyList<NavItemDto> Children { get; init; } = [];
}
