using Dapper;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using TranslationTables.Api.Data;
using TranslationTables.Api.Data.Entities;
using TranslationTables.Api.Features.Languages;

namespace TranslationTables.Api.Features.Products;

public interface IProductService
{
    Task<IReadOnlyList<ProductListItemResponse>> ListAsync(string languageCode, CancellationToken cancellationToken);
    Task<ProductResponse?> GetByIdAsync(int id, string languageCode, CancellationToken cancellationToken);
    Task<ProductResponse> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken);
    Task<ProductResponse?> UpdateAsync(int id, UpdateProductRequest request, CancellationToken cancellationToken);
}

public sealed class ProductService(AppDbContext dbContext, NpgsqlDataSource dataSource) : IProductService
{
    public async Task<IReadOnlyList<ProductListItemResponse>> ListAsync(
        string languageCode,
        CancellationToken cancellationToken)
    {
        EnsureSupportedLanguage(languageCode);
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition("""
                                            select p.id, p.sku, p.price, ct.name as "CategoryName", pt.name as "Name", pt.description as "Description",
                                                (pt.product_id is not null) as "HasTranslation"
                                            from products p
                                            join categories c on c.id = p.category_id
                                            left join category_translations ct on ct.category_id = c.id and ct.language_code = @LanguageCode
                                            left join product_translations pt on pt.product_id = p.id and pt.language_code = @LanguageCode
                                            order by p.sku
                                            """, new { LanguageCode = languageCode.ToLowerInvariant() }, cancellationToken: cancellationToken);
        var rows = await connection.QueryAsync<ProductListItemResponse>(command);
        return rows.AsList();
    }

    public async Task<ProductResponse?> GetByIdAsync(
        int id,
        string languageCode,
        CancellationToken cancellationToken)
    {
        EnsureSupportedLanguage(languageCode);
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            """
            select p.id as "Id", p.sku as "Sku", p.price as "Price", p.category_id as "CategoryId",
                   pt.name as "Name", pt.description as "Description"
            from products p
            left join product_translations pt on pt.product_id = p.id and pt.language_code = @LanguageCode
            where p.id = @Id
            """,
            new { Id = id, LanguageCode = languageCode.ToLowerInvariant() },
            cancellationToken: cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<ProductResponse>(command);
    }

    public async Task<ProductResponse> CreateAsync(
        CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        EnsureSupportedLanguage(request.LanguageCode);
        if (!await dbContext.Categories.AnyAsync(category => category.Id == request.CategoryId, cancellationToken))
            throw new ArgumentException("The selected category does not exist.");

        var product = new Product
        {
            Sku = request.Sku.Trim(),
            Price = request.Price,
            CategoryId = request.CategoryId,
            Translations =
            [
                new ProductTranslation
                {
                    LanguageCode = request.LanguageCode.ToLowerInvariant(),
                    Name = request.Name.Trim(),
                    Description = request.Description.Trim()
                }
            ]
        };
        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(product.Id, request.LanguageCode, cancellationToken))!;
    }

    public async Task<ProductResponse?> UpdateAsync(
        int id,
        UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        EnsureSupportedLanguage(request.LanguageCode);
        var product = await dbContext.Products
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (product is null)
            return null;

        if (!await dbContext.Categories.AnyAsync(category => category.Id == request.CategoryId, cancellationToken))
            throw new ArgumentException("The selected category does not exist.");

        product.Sku = request.Sku.Trim();
        product.Price = request.Price;
        product.CategoryId = request.CategoryId;
        var translation = await dbContext.ProductTranslations
            .SingleOrDefaultAsync(item => item.ProductId == id && item.LanguageCode == request.LanguageCode.ToLowerInvariant(), cancellationToken);
        if (translation is null)
        {
            translation = new ProductTranslation
            {
                ProductId = id,
                LanguageCode = request.LanguageCode.ToLowerInvariant(),
                Name = request.Name.Trim(),
                Description = request.Description.Trim()
            };
            dbContext.ProductTranslations.Add(translation);
        }
        else
        {
            translation.Name = request.Name.Trim();
            translation.Description = request.Description.Trim();
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, request.LanguageCode, cancellationToken);
    }

    private static void EnsureSupportedLanguage(string languageCode)
    {
        if (!SupportedLanguages.Contains(languageCode))
            throw new ArgumentException("Language code must be one of tr, en, or fr.");
    }
}