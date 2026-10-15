using Microsoft.EntityFrameworkCore;
using TranslationTables.Api.Data.Entities;

namespace TranslationTables.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Language> Languages => Set<Language>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<CategoryTranslation> CategoryTranslations => Set<CategoryTranslation>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductTranslation> ProductTranslations => Set<ProductTranslation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Language>(entity =>
        {
            entity.ToTable("languages");
            entity.HasKey(language => language.Code);
            entity.Property(language => language.Code).HasColumnName("code").HasMaxLength(2);
            entity.Property(language => language.DisplayName).HasColumnName("display_name").HasMaxLength(40).IsRequired();
            entity.HasData(
                new Language { Code = "tr", DisplayName = "Turkish" },
                new Language { Code = "en", DisplayName = "English" },
                new Language { Code = "fr", DisplayName = "French" });
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(category => category.Id);
            entity.Property(category => category.Id).HasColumnName("id");
            entity.Property(category => category.Code).HasColumnName("code").HasMaxLength(40).IsRequired();
            entity.HasIndex(category => category.Code).IsUnique();
            entity.HasMany(category => category.Translations)
                .WithOne(translation => translation.Category)
                .HasForeignKey(translation => translation.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CategoryTranslation>(entity =>
        {
            entity.ToTable("category_translations");
            entity.HasKey(translation => new { translation.CategoryId, translation.LanguageCode });
            entity.Property(translation => translation.CategoryId).HasColumnName("category_id");
            entity.Property(translation => translation.LanguageCode).HasColumnName("language_code").HasMaxLength(2);
            entity.Property(translation => translation.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
            entity.Property(translation => translation.Description).HasColumnName("description").HasMaxLength(500).IsRequired();
            entity.HasOne(translation => translation.Language)
                .WithMany()
                .HasForeignKey(translation => translation.LanguageCode)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(product => product.Id);
            entity.Property(product => product.Id).HasColumnName("id");
            entity.Property(product => product.Sku).HasColumnName("sku").HasMaxLength(40).IsRequired();
            entity.Property(product => product.Price).HasColumnName("price").HasPrecision(12, 2);
            entity.Property(product => product.CategoryId).HasColumnName("category_id");
            entity.HasIndex(product => product.Sku).IsUnique();
            entity.HasOne(product => product.Category)
                .WithMany(category => category.Products)
                .HasForeignKey(product => product.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(product => product.Translations)
                .WithOne(translation => translation.Product)
                .HasForeignKey(translation => translation.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductTranslation>(entity =>
        {
            entity.ToTable("product_translations");
            entity.HasKey(translation => new { translation.ProductId, translation.LanguageCode });
            entity.Property(translation => translation.ProductId).HasColumnName("product_id");
            entity.Property(translation => translation.LanguageCode).HasColumnName("language_code").HasMaxLength(2);
            entity.Property(translation => translation.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
            entity.Property(translation => translation.Description).HasColumnName("description").HasMaxLength(1000).IsRequired();
            entity.HasOne(translation => translation.Language)
                .WithMany()
                .HasForeignKey(translation => translation.LanguageCode)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}