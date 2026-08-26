using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OfferlalFashion.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBrandsAndCategoryTree : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NOTE: hand-edited after scaffolding.
            //
            // EF ordered AddColumn(BrandId) before CreateTable(Brands) and gave it
            // defaultValue 0, which would violate FK_Products_Brand on any table that
            // already has rows. Reordered so Brands exists and holds the house-label
            // row before Products gains the column, and the default points at that row.
            //
            // The house brand is reference data, not transactional seed data, so it
            // belongs here rather than in seed.sql — this keeps seed.sql's Product
            // INSERTs working unchanged, since they never specify BrandId.

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Categories",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<byte>(
                name: "Level",
                table: "Categories",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)0);

            migrationBuilder.AddColumn<string>(
                name: "Path",
                table: "Categories",
                type: "varchar(400)",
                unicode: false,
                maxLength: 400,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Brands",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Slug = table.Column<string>(type: "varchar(120)", unicode: false, maxLength: 120, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: ""),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BannerUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    SeoTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SeoDescription = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    SeoKeywords = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Brands", x => x.Id);
                });

            // Seed the house label as Id 1 so it can be the default for existing products.
            migrationBuilder.Sql(@"
                SET IDENTITY_INSERT dbo.Brands ON;
                INSERT INTO dbo.Brands (Id, Slug, Name, Description, DisplayOrder, SeoTitle, SeoDescription)
                VALUES (1, 'offerlal', 'Offerlal',
                        'House label - curated Indian bridal and occasion wear.', 0,
                        'Offerlal | Premium Indian Bridal & Occasion Wear',
                        'Shop the Offerlal house label - hand-finished bridal lehengas, sarees and occasion wear.');
                SET IDENTITY_INSERT dbo.Brands OFF;
            ");

            // Added AFTER Brands exists and is populated; defaults to the house label.
            migrationBuilder.AddColumn<int>(
                name: "BrandId",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_Products_BrandId",
                table: "Products",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Path",
                table: "Categories",
                column: "Path");

            migrationBuilder.CreateIndex(
                name: "IX_Brands_Slug",
                table: "Brands",
                column: "Slug",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Brand",
                table: "Products",
                column: "BrandId",
                principalTable: "Brands",
                principalColumn: "Id");

            // Backfill the materialised path for any categories that already exist.
            // No-op on a fresh database (seed runs later and sets its own paths);
            // correct on a populated one. Handles up to 4 levels, which is well
            // beyond the 2 the catalogue actually uses.
            migrationBuilder.Sql(@"
                UPDATE dbo.Categories SET Path = '/' + Id + '/', Level = 0 WHERE ParentId IS NULL;

                WITH lvl AS (
                    SELECT c.Id, p.Path + c.Id + '/' AS NewPath, p.Level + 1 AS NewLevel
                    FROM dbo.Categories c
                    JOIN dbo.Categories p ON p.Id = c.ParentId
                    WHERE c.ParentId IS NOT NULL AND p.Path <> ''
                )
                UPDATE c SET c.Path = l.NewPath, c.Level = CAST(l.NewLevel AS tinyint)
                FROM dbo.Categories c JOIN lvl l ON l.Id = c.Id
                WHERE c.Path = '' OR c.Path IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_Brand",
                table: "Products");

            migrationBuilder.DropTable(
                name: "Brands");

            migrationBuilder.DropIndex(
                name: "IX_Products_BrandId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Path",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "BrandId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Path",
                table: "Categories");
        }
    }
}
