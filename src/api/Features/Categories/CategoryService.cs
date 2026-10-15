using Dapper;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using TranslationTables.Api.Data;
using TranslationTables.Api.Data.Entities;
using TranslationTables.Api.Features.Languages;

namespace TranslationTables.Api.Features.Categories;

public interface ICategoryService
{
    Task<IReadOnlyList<LocalizedCategoryResponse>> ListAsync(string languageCode, CancellationToken cancellationToken);
    Task<CategoryDetailResponse?> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<CategoryDetailResponse> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken);
    Task<CategoryDetailResponse?> UpdateAsync(int id, UpdateCategoryRequest request, CancellationToken cancellationToken);
}

public sealed class CategoryService(AppDbContext dbContext, NpgsqlDataSource dataSource) : ICategoryService
{
    public async Task<IReadOnlyList<LocalizedCategoryResponse>> ListAsync(
        string languageCode,
        CancellationToken cancellationToken)
    {
        EnsureSupportedLanguage(languageCode);
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        const string sql = """
            select c.id, c.code, t.name, t.description, (t.category_id is not null) as "HasTranslation"
            from categories c
            left join category_translations t on t.category_id = c.id and t.language_code = @LanguageCode
            order by c.code
            """;
        var command = new CommandDefinition(sql, new { LanguageCode = languageCode.ToLowerInvariant() }, cancellationToken: cancellationToken);
        var rows = await connection.QueryAsync<LocalizedCategoryResponse>(command);
        return rows.AsList();
    }

    public async Task<CategoryDetailResponse?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            """
            select c.id, c.code, t.language_code as "LanguageCode", t.name, t.description
            from categories c
            left join category_translations t on t.category_id = c.id
            where c.id = @Id
            """,
            new { Id = id },
            cancellationToken: cancellationToken);
        CategoryRow? category = null;
        var translations = new List<CategoryTranslationResponse>();
        await connection.QueryAsync<CategoryRow, CategoryTranslationRow, int>(
            command,
            (categoryRow, translationRow) =>
            {
                category ??= categoryRow;
                if (translationRow?.LanguageCode is not null)
                {
                    translations.Add(new CategoryTranslationResponse(
                        translationRow.LanguageCode,
                        translationRow.Name!,
                        translationRow.Description!));
                }

                return categoryRow.Id;
            },
            splitOn: "LanguageCode");

        return category is null
            ? null
            : new CategoryDetailResponse(category.Id, category.Code, translations);
    }

    public async Task<CategoryDetailResponse> CreateAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        ValidateTranslations(request.Translations);
        var category = new Category
        {
            Code = request.Code.Trim(),
            Translations = request.Translations.Select(ToEntity).ToList()
        };
        dbContext.Categories.Add(category);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(category.Id, cancellationToken))!;
    }

    public async Task<CategoryDetailResponse?> UpdateAsync(
        int id,
        UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        ValidateTranslations(request.Translations);
        var category = await dbContext.Categories
            .Include(item => item.Translations)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (category is null)
            return null;

        category.Code = request.Code.Trim();
        var existingTranslations = category.Translations.ToDictionary(item => item.LanguageCode, StringComparer.Ordinal);
        foreach (var input in request.Translations)
        {
            var languageCode = input.LanguageCode.ToLowerInvariant();
            if (!existingTranslations.TryGetValue(languageCode, out var translation))
            {
                translation = new CategoryTranslation
                {
                    CategoryId = id,
                    LanguageCode = languageCode,
                    Name = string.Empty,
                    Description = string.Empty
                };
                dbContext.CategoryTranslations.Add(translation);
            }

            translation.Name = input.Name.Trim();
            translation.Description = input.Description.Trim();
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    private static CategoryTranslation ToEntity(CategoryTranslationInput input) => new()
    {
        LanguageCode = input.LanguageCode.ToLowerInvariant(),
        Name = input.Name.Trim(),
        Description = input.Description.Trim()
    };

    private static void ValidateTranslations(IReadOnlyList<CategoryTranslationInput> translations)
    {
        var codes = translations.Select(item => item.LanguageCode.ToLowerInvariant()).ToArray();
        if (codes.Length != SupportedLanguages.Codes.Length ||
            codes.Distinct(StringComparer.Ordinal).Count() != SupportedLanguages.Codes.Length ||
            !SupportedLanguages.Codes.All(codes.Contains))
        {
            throw new ArgumentException("Provide exactly one translation for tr, en, and fr.");
        }
    }

    private static void EnsureSupportedLanguage(string languageCode)
    {
        if (!SupportedLanguages.Contains(languageCode))
            throw new ArgumentException("Language code must be one of tr, en, or fr.");
    }

    private sealed record CategoryRow(int Id, string Code);
    private sealed record CategoryTranslationRow(string? LanguageCode, string? Name, string? Description);
}