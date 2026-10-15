using System.ComponentModel.DataAnnotations;

namespace TranslationTables.Api.Features.Categories;

/// <summary>A localized category translation supplied to the API.</summary>
public sealed record CategoryTranslationInput
{
    [Required, StringLength(2, MinimumLength = 2)]
    public required string LanguageCode { get; init; }

    [Required, StringLength(120, MinimumLength = 1)]
    public required string Name { get; init; }

    [Required, StringLength(500)]
    public required string Description { get; init; }
}

/// <summary>Payload for creating a category with all supported translations.</summary>
public sealed record CreateCategoryRequest
{
    [Required, StringLength(40, MinimumLength = 1)]
    public required string Code { get; init; }

    [Required, MinLength(3), MaxLength(3)]
    public required IReadOnlyList<CategoryTranslationInput> Translations { get; init; }
}

/// <summary>Payload for replacing a category and all its translations.</summary>
public sealed record UpdateCategoryRequest
{
    [Required, StringLength(40, MinimumLength = 1)]
    public required string Code { get; init; }

    [Required, MinLength(3), MaxLength(3)]
    public required IReadOnlyList<CategoryTranslationInput> Translations { get; init; }
}

/// <summary>A translation of a category name and description.</summary>
public sealed record CategoryTranslationResponse(string LanguageCode, string Name, string Description);

/// <summary>A category returned for the currently selected language.</summary>
public sealed record LocalizedCategoryResponse(
    int Id,
    string Code,
    string? Name,
    string? Description,
    bool HasTranslation);

/// <summary>A category and all its translations.</summary>
public sealed record CategoryDetailResponse(
    int Id,
    string Code,
    IReadOnlyList<CategoryTranslationResponse> Translations);