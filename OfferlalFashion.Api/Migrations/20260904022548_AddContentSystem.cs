using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OfferlalFashion.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContentSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContentPages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Key = table.Column<string>(type: "varchar(60)", unicode: false, maxLength: 60, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PublishedRevisionId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentPages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    DefinitionJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MaxItems = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductRules", x => x.Id);
                    table.CheckConstraint("CK_ProductRules_Definition_Json", "ISJSON(DefinitionJson) = 1");
                });

            migrationBuilder.CreateTable(
                name: "SectionTypes",
                columns: table => new
                {
                    Code = table.Column<string>(type: "varchar(60)", unicode: false, maxLength: 60, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SchemaJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ItemKind = table.Column<string>(type: "varchar(40)", unicode: false, maxLength: 40, nullable: true),
                    MaxItems = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SectionTypes", x => x.Code);
                });

            migrationBuilder.CreateTable(
                name: "PageRevisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PageId = table.Column<int>(type: "int", nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    PublishedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PageRevisions_Page",
                        column: x => x.PageId,
                        principalTable: "ContentPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PageSections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PageId = table.Column<int>(type: "int", nullable: false),
                    SectionTypeCode = table.Column<string>(type: "varchar(60)", unicode: false, maxLength: 60, nullable: false),
                    Eyebrow = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Heading = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Subheading = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CtaLabel = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    CtaUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndsAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProductRuleId = table.Column<int>(type: "int", nullable: true),
                    ConfigJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageSections", x => x.Id);
                    table.CheckConstraint("CK_PageSections_Config_Json", "ISJSON(ConfigJson) = 1");
                    table.ForeignKey(
                        name: "FK_PageSections_Page",
                        column: x => x.PageId,
                        principalTable: "ContentPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PageSections_ProductRule",
                        column: x => x.ProductRuleId,
                        principalTable: "ProductRules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PageSections_SectionType",
                        column: x => x.SectionTypeCode,
                        principalTable: "SectionTypes",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PageSectionItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SectionId = table.Column<int>(type: "int", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    ItemKind = table.Column<string>(type: "varchar(40)", unicode: false, maxLength: 40, nullable: false),
                    ProductId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    CategoryId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    OccasionId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    MediaAssetId = table.Column<int>(type: "int", nullable: true),
                    MediaAssetMobileId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Subtitle = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Caption = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BadgeText = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    LinkUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    StartsAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndsAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageSectionItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PageSectionItems_Category",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PageSectionItems_MediaAsset",
                        column: x => x.MediaAssetId,
                        principalTable: "MediaAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PageSectionItems_MediaAssetMobile",
                        column: x => x.MediaAssetMobileId,
                        principalTable: "MediaAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PageSectionItems_Occasion",
                        column: x => x.OccasionId,
                        principalTable: "Occasions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PageSectionItems_Product",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PageSectionItems_Section",
                        column: x => x.SectionId,
                        principalTable: "PageSections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "UQ_ContentPages_Key",
                table: "ContentPages",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PageRevisions_Page_PublishedAt",
                table: "PageRevisions",
                columns: new[] { "PageId", "PublishedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PageSectionItems_CategoryId",
                table: "PageSectionItems",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PageSectionItems_MediaAssetId",
                table: "PageSectionItems",
                column: "MediaAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_PageSectionItems_MediaAssetMobileId",
                table: "PageSectionItems",
                column: "MediaAssetMobileId");

            migrationBuilder.CreateIndex(
                name: "IX_PageSectionItems_OccasionId",
                table: "PageSectionItems",
                column: "OccasionId");

            migrationBuilder.CreateIndex(
                name: "IX_PageSectionItems_ProductId",
                table: "PageSectionItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PageSectionItems_Section_Order",
                table: "PageSectionItems",
                columns: new[] { "SectionId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_PageSections_Page_Order",
                table: "PageSections",
                columns: new[] { "PageId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_PageSections_ProductRuleId",
                table: "PageSections",
                column: "ProductRuleId");

            migrationBuilder.CreateIndex(
                name: "IX_PageSections_SectionTypeCode",
                table: "PageSections",
                column: "SectionTypeCode");

            migrationBuilder.CreateIndex(
                name: "UQ_ProductRules_Name",
                table: "ProductRules",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PageRevisions");

            migrationBuilder.DropTable(
                name: "PageSectionItems");

            migrationBuilder.DropTable(
                name: "PageSections");

            migrationBuilder.DropTable(
                name: "ContentPages");

            migrationBuilder.DropTable(
                name: "ProductRules");

            migrationBuilder.DropTable(
                name: "SectionTypes");
        }
    }
}
