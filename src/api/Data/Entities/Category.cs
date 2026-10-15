namespace TranslationTables.Api.Data.Entities;

public sealed class Category
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public List<CategoryTranslation> Translations { get; set; } = [];
    public List<Product> Products { get; set; } = [];
}