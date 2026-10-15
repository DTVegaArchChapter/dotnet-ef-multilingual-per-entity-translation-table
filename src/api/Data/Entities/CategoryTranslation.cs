namespace TranslationTables.Api.Data.Entities;

public sealed class CategoryTranslation
{
    public int CategoryId { get; set; }
    public required string LanguageCode { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public Category Category { get; set; } = null!;
    public Language Language { get; set; } = null!;
}