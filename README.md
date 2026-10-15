# Per-Entity Translation Tables

A .NET 10 Web API and React/Vite TypeScript app demonstrating a separate translation table per entity. EF Core 10 with PostgreSQL handles writes and migrations; Dapper handles all query endpoints.

## Prerequisites

- .NET 10 SDK
- Node.js 20.19+ (Node 24 is suitable)
- PostgreSQL listening on `localhost:5432`

## Configure PostgreSQL

The development connection defaults to database `translation_tables` and PostgreSQL's common local `postgres` account. Override it in PowerShell if your local credentials differ:

```powershell
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=translation_tables;Username=postgres;Password=YOUR_PASSWORD"
```

Create the database if it does not exist, then apply the EF migration:

```powershell
dotnet ef database update --project src/api/TranslationTables.Api.csproj --startup-project src/api/TranslationTables.Api.csproj
```

The initial migration creates the `tr`, `en`, and `fr` language rows and the category, product, and per-entity translation tables.

## Run

Start the API with its HTTP launch profile:

```powershell
dotnet run --project src/api/TranslationTables.Api.csproj --launch-profile http
```

ASP.NET Core SpaProxy starts the Vite dev server in `src/web` and redirects the browser to `http://127.0.0.1:5173`. Vite forwards `/api` requests to the API at `http://localhost:5072`.

The API OpenAPI document is available at `http://localhost:5072/openapi/v1.json`.

To run the frontend separately:

```powershell
npm --prefix src/web run dev
```

## Workflows

- Categories are created and edited with all three translations together.
- Products are created and edited in one selected language; saving adds or updates only that translation.
- Both lists can be filtered by language. Missing localized values are shown as missing, without fallback.
- Product records reference a category; SKU, price, and category are shared across languages.

## Build

```powershell
dotnet build TranslationTables.slnx
npm --prefix src/web run build
```