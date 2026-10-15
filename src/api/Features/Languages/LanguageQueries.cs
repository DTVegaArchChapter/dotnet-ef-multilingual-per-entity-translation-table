using Dapper;
using Npgsql;

namespace TranslationTables.Api.Features.Languages;

public interface ILanguageQueries
{
    Task<IReadOnlyList<LanguageResponse>> ListAsync(CancellationToken cancellationToken);
}

public sealed class LanguageQueries(NpgsqlDataSource dataSource) : ILanguageQueries
{
    public async Task<IReadOnlyList<LanguageResponse>> ListAsync(CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            "select code, display_name as \"DisplayName\" from languages order by code",
            cancellationToken: cancellationToken);
        var rows = await connection.QueryAsync<LanguageResponse>(command);
        return rows.AsList();
    }
}