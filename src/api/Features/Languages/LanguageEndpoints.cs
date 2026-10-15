namespace TranslationTables.Api.Features.Languages;

public static class LanguageEndpoints
{
    public static WebApplication MapLanguageEndpoints(this WebApplication app)
    {
        app.MapGet("/api/languages", async (ILanguageQueries queries, CancellationToken cancellationToken) =>
                TypedResults.Ok(await queries.ListAsync(cancellationToken)))
            .WithName("ListLanguages")
            .WithSummary("List supported languages")
            .WithDescription("Returns the supported translation languages: Turkish, English, and French.");

        return app;
    }
}