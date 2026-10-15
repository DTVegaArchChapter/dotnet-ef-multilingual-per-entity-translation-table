using Microsoft.AspNetCore.Http.HttpResults;

namespace TranslationTables.Api.Features.Products;

public static class ProductEndpoints
{
    public static WebApplication MapProductEndpoints(this WebApplication app)
    {
        var products = app.MapGroup("/api/products").WithTags("Products");

        products.MapGet("/", async (string? languageCode, IProductService service, CancellationToken cancellationToken) =>
                TypedResults.Ok(await service.ListAsync(languageCode ?? "en", cancellationToken)))
            .WithName("ListProducts")
            .WithSummary("List products in a selected language")
            .WithDescription("Returns products with localized product and category names where available.");

        products.MapGet("/{id:int}", GetById)
            .WithName("GetProduct")
            .WithSummary("Get a product in a selected language")
            .Produces<ProductResponse>()
            .Produces(StatusCodes.Status404NotFound);

        products.MapPost("/", Create)
            .WithName("CreateProduct")
            .WithSummary("Create a product with one selected language translation");

        products.MapPut("/{id:int}", Update)
            .WithName("UpdateProduct")
            .WithSummary("Update product details and upsert one language translation")
            .Produces<ProductResponse>()
            .Produces(StatusCodes.Status404NotFound);

        return app;
    }

    private static async Task<Created<ProductResponse>> Create(
        CreateProductRequest request,
        IProductService service,
        CancellationToken cancellationToken)
    {
        var product = await service.CreateAsync(request, cancellationToken);
        return TypedResults.Created($"/api/products/{product.Id}", product);
    }

    private static async Task<Results<Ok<ProductResponse>, NotFound>> GetById(
        int id,
        string? languageCode,
        IProductService service,
        CancellationToken cancellationToken)
    {
        var product = await service.GetByIdAsync(id, languageCode ?? "en", cancellationToken);
        return product is null ? TypedResults.NotFound() : TypedResults.Ok(product);
    }

    private static async Task<Results<Ok<ProductResponse>, NotFound>> Update(
        int id,
        UpdateProductRequest request,
        IProductService service,
        CancellationToken cancellationToken)
    {
        var product = await service.UpdateAsync(id, request, cancellationToken);
        return product is null ? TypedResults.NotFound() : TypedResults.Ok(product);
    }
}