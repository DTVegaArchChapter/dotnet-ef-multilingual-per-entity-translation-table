using System.ComponentModel.DataAnnotations;

namespace TranslationTables.Api.Features.Products;

/// <summary>Payload for creating a product with one selected language translation.</summary>
public sealed record CreateProductRequest
{
    [Required, StringLength(40, MinimumLength = 1)]
    public required string Sku { get; init; }

    [Range(typeof(decimal), "0", "9999999999")]
    public required decimal Price { get; init; }

    [Range(1, int.MaxValue)]
    public required int CategoryId { get; init; }

    [Required, StringLength(2, MinimumLength = 2)]
    public required string LanguageCode { get; init; }

    [Required, StringLength(160, MinimumLength = 1)]
    public required string Name { get; init; }

    [Required, StringLength(1000)]
    public required string Description { get; init; }
}

/// <summary>Payload for updating product details and one selected language translation.</summary>
public sealed record UpdateProductRequest
{
    [Required, StringLength(40, MinimumLength = 1)]
    public required string Sku { get; init; }

    [Range(typeof(decimal), "0", "9999999999")]
    public required decimal Price { get; init; }

    [Range(1, int.MaxValue)]
    public required int CategoryId { get; init; }

    [Required, StringLength(2, MinimumLength = 2)]
    public required string LanguageCode { get; init; }

    [Required, StringLength(160, MinimumLength = 1)]
    public required string Name { get; init; }

    [Required, StringLength(1000)]
    public required string Description { get; init; }
}

/// <summary>A product returned in a selected language.</summary>
public sealed record ProductResponse(
    int Id,
    string Sku,
    decimal Price,
    int CategoryId,
    string? Name,
    string? Description);

public sealed record ProductListItemResponse(
    int Id,
    string Sku,
    decimal Price,
    string? CategoryName,
    string? Name,
    string? Description,
    bool HasTranslation);