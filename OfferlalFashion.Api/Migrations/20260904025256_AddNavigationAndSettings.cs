using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OfferlalFashion.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNavigationAndSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NavMenus",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "varchar(40)", unicode: false, maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NavMenus", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StoreSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ValueType = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Group = table.Column<string>(type: "varchar(60)", unicode: false, maxLength: 60, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreSettings", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "NavItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MenuId = table.Column<int>(type: "int", nullable: false),
                    ParentId = table.Column<int>(type: "int", nullable: true),
                    Label = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CategoryId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    OccasionId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    MediaAssetId = table.Column<int>(type: "int", nullable: true),
                    IconName = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    ColumnIndex = table.Column<byte>(type: "tinyint", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsHighlighted = table.Column<bool>(type: "bit", nullable: false),
                    BadgeText = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    StartsAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndsAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NavItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NavItems_Category",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NavItems_MediaAsset",
                        column: x => x.MediaAssetId,
                        principalTable: "MediaAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NavItems_Menu",
                        column: x => x.MenuId,
                        principalTable: "NavMenus",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NavItems_Occasion",
                        column: x => x.OccasionId,
                        principalTable: "Occasions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NavItems_Parent",
                        column: x => x.ParentId,
                        principalTable: "NavItems",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_NavItems_CategoryId",
                table: "NavItems",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_NavItems_MediaAssetId",
                table: "NavItems",
                column: "MediaAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_NavItems_Menu_Parent_Order",
                table: "NavItems",
                columns: new[] { "MenuId", "ParentId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_NavItems_OccasionId",
                table: "NavItems",
                column: "OccasionId");

            migrationBuilder.CreateIndex(
                name: "IX_NavItems_ParentId",
                table: "NavItems",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "UQ_NavMenus_Code",
                table: "NavMenus",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StoreSettings_Group",
                table: "StoreSettings",
                column: "Group");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NavItems");

            migrationBuilder.DropTable(
                name: "StoreSettings");

            migrationBuilder.DropTable(
                name: "NavMenus");
        }
    }
}
