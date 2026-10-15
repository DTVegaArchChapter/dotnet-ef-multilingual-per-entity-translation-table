namespace TranslationTables.Api.Data.Entities;

public sealed class Product
{
    public int Id { get; set; }
    public required string Sku { get; set; }
    public decimal Price { get; set; }
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public List<ProductTranslation> Translations { get; set; } = [];
}