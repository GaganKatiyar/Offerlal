using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OfferlalFashion.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaLibrary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MediaAssetId",
                table: "ProductImages",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ImageAssetId",
                table: "Occasions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HeroImageAssetId",
                table: "Categories",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ThumbnailAssetId",
                table: "Categories",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LogoAssetId",
                table: "Brands",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MediaAssets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StorageKey = table.Column<string>(type: "varchar(500)", unicode: false, maxLength: 500, nullable: true),
                    Url = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    SourceUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ContentType = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: false),
                    Width = table.Column<int>(type: "int", nullable: true),
                    Height = table.Column<int>(type: "int", nullable: true),
                    Bytes = table.Column<long>(type: "bigint", nullable: true),
                    AltText = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Folder = table.Column<string>(type: "varchar(200)", unicode: false, maxLength: 200, nullable: false, defaultValue: "uploads"),
                    Tags = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DerivativeWidths = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: true),
                    ChecksumSha256 = table.Column<string>(type: "char(64)", unicode: false, fixedLength: true, maxLength: 64, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaAssets", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_MediaAssetId",
                table: "ProductImages",
                column: "MediaAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Occasions_ImageAssetId",
                table: "Occasions",
                column: "ImageAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_HeroImageAssetId",
                table: "Categories",
                column: "HeroImageAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_ThumbnailAssetId",
                table: "Categories",
                column: "ThumbnailAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Brands_LogoAssetId",
                table: "Brands",
                column: "LogoAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssets_Checksum",
                table: "MediaAssets",
                column: "ChecksumSha256");

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssets_Folder_CreatedAt",
                table: "MediaAssets",
                columns: new[] { "Folder", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "UQ_MediaAssets_Url",
                table: "MediaAssets",
                column: "Url",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Brands_LogoAsset",
                table: "Brands",
                column: "LogoAssetId",
                principalTable: "MediaAssets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_HeroImageAsset",
                table: "Categories",
                column: "HeroImageAssetId",
                principalTable: "MediaAssets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_ThumbnailAsset",
                table: "Categories",
                column: "ThumbnailAssetId",
                principalTable: "MediaAssets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Occasions_ImageAsset",
                table: "Occasions",
                column: "ImageAssetId",
                principalTable: "MediaAssets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductImages_MediaAsset",
                table: "ProductImages",
                column: "MediaAssetId",
                principalTable: "MediaAssets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Brands_LogoAsset",
                table: "Brands");

            migrationBuilder.DropForeignKey(
                name: "FK_Categories_HeroImageAsset",
                table: "Categories");

            migrationBuilder.DropForeignKey(
                name: "FK_Categories_ThumbnailAsset",
                table: "Categories");

            migrationBuilder.DropForeignKey(
                name: "FK_Occasions_ImageAsset",
                table: "Occasions");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductImages_MediaAsset",
                table: "ProductImages");

            migrationBuilder.DropTable(
                name: "MediaAssets");

            migrationBuilder.DropIndex(
                name: "IX_ProductImages_MediaAssetId",
                table: "ProductImages");

            migrationBuilder.DropIndex(
                name: "IX_Occasions_ImageAssetId",
                table: "Occasions");

            migrationBuilder.DropIndex(
                name: "IX_Categories_HeroImageAssetId",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Categories_ThumbnailAssetId",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Brands_LogoAssetId",
                table: "Brands");

            migrationBuilder.DropColumn(
                name: "MediaAssetId",
                table: "ProductImages");

            migrationBuilder.DropColumn(
                name: "ImageAssetId",
                table: "Occasions");

            migrationBuilder.DropColumn(
                name: "HeroImageAssetId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "ThumbnailAssetId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "LogoAssetId",
                table: "Brands");
        }
    }
}
