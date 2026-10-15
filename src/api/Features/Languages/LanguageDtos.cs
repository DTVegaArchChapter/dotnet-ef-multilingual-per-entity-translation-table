namespace TranslationTables.Api.Features.Languages;

/// <summary>A language supported by the translation tables.</summary>
public sealed record LanguageResponse(string Code, string DisplayName);

public static class SupportedLanguages
{
    public static readonly string[] Codes = ["tr", "en", "fr"];

    public static bool Contains(string? code) =>
        code is not null && Codes.Contains(code, StringComparer.OrdinalIgnoreCase);
}