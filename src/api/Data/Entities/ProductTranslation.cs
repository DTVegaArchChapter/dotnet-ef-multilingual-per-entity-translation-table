namespace TranslationTables.Api.Data.Entities;

public sealed class ProductTranslation
{
    public int ProductId { get; set; }
    public required string LanguageCode { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public Product Product { get; set; } = null!;
    public Language Language { get; set; } = null!;
}