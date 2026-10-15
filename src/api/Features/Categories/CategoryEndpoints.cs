using Microsoft.AspNetCore.Http.HttpResults;

namespace TranslationTables.Api.Features.Categories;

public static class CategoryEndpoints
{
    public static WebApplication MapCategoryEndpoints(this WebApplication app)
    {
        var categories = app.MapGroup("/api/categories").WithTags("Categories");

        categories.MapGet("/", async (string? languageCode, ICategoryService service, CancellationToken cancellationToken) =>
                TypedResults.Ok(await service.ListAsync(languageCode ?? "en", cancellationToken)))
            .WithName("ListCategories")
            .WithSummary("List categories in a selected language")
            .WithDescription("Returns every category, marking categories without the selected translation.");

        categories.MapGet("/{id:int}", GetById)
            .WithName("GetCategory")
            .WithSummary("Get a category and all translations")
            .Produces<CategoryDetailResponse>()
            .Produces(StatusCodes.Status404NotFound);

        categories.MapPost("/", Create)
            .WithName("CreateCategory")
            .WithSummary("Create a category with Turkish, English, and French translations");

        categories.MapPut("/{id:int}", Update)
            .WithName("UpdateCategory")
            .WithSummary("Replace a category and all translations")
            .Produces<CategoryDetailResponse>()
            .Produces(StatusCodes.Status404NotFound);

        return app;
    }

    private static async Task<Created<CategoryDetailResponse>> Create(
        CreateCategoryRequest request,
        ICategoryService service,
        CancellationToken cancellationToken)
    {
        var category = await service.CreateAsync(request, cancellationToken);
        return TypedResults.Created($"/api/categories/{category.Id}", category);
    }

    private static async Task<Results<Ok<CategoryDetailResponse>, NotFound>> GetById(
        int id,
        ICategoryService service,
        CancellationToken cancellationToken)
    {
        var category = await service.GetByIdAsync(id, cancellationToken);
        return category is null ? TypedResults.NotFound() : TypedResults.Ok(category);
    }

    private static async Task<Results<Ok<CategoryDetailResponse>, NotFound>> Update(
        int id,
        UpdateCategoryRequest request,
        ICategoryService service,
        CancellationToken cancellationToken)
    {
        var category = await service.UpdateAsync(id, request, cancellationToken);
        return category is null ? TypedResults.NotFound() : TypedResults.Ok(category);
    }
}