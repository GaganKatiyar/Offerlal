using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OfferlalFashion.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDynamicAttributeSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ColorOptionId",
                table: "ProductVariants",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SizeOptionId",
                table: "ProductSkus",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AttributeSetId",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DisplayAttributesJson",
                table: "Products",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.CreateTable(
                name: "AttributeGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttributeGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AttributeSets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttributeSets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Attributes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "varchar(60)", unicode: false, maxLength: 60, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    GroupId = table.Column<int>(type: "int", nullable: true),
                    ValueKind = table.Column<string>(type: "varchar(12)", unicode: false, maxLength: 12, nullable: false),
                    InputType = table.Column<string>(type: "varchar(12)", unicode: false, maxLength: 12, nullable: false),
                    Scope = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false, defaultValue: "product"),
                    IsFacetable = table.Column<bool>(type: "bit", nullable: false),
                    IsSearchable = table.Column<bool>(type: "bit", nullable: false),
                    ShowOnPdp = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    Unit = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attributes", x => x.Id);
                    table.CheckConstraint("CK_Attributes_FacetableIsNotText", "IsFacetable = 0 OR ValueKind IN ('Option','Number','Bool')");
                    table.CheckConstraint("CK_Attributes_Scope", "Scope IN ('product','variant','sku')");
                    table.CheckConstraint("CK_Attributes_ValueKind", "ValueKind IN ('Option','Number','Text','Bool')");
                    table.ForeignKey(
                        name: "FK_Attributes_Group",
                        column: x => x.GroupId,
                        principalTable: "AttributeGroups",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AttributeOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttributeId = table.Column<int>(type: "int", nullable: false),
                    Slug = table.Column<string>(type: "varchar(80)", unicode: false, maxLength: 80, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ColorHex = table.Column<string>(type: "char(7)", unicode: false, fixedLength: true, maxLength: 7, nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttributeOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AttributeOptions_Attribute",
                        column: x => x.AttributeId,
                        principalTable: "Attributes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AttributeSetAttributes",
                columns: table => new
                {
                    AttributeSetId = table.Column<int>(type: "int", nullable: false),
                    AttributeId = table.Column<int>(type: "int", nullable: false),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttributeSetAttributes", x => new { x.AttributeSetId, x.AttributeId });
                    table.ForeignKey(
                        name: "FK_AttributeSetAttributes_Attribute",
                        column: x => x.AttributeId,
                        principalTable: "Attributes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AttributeSetAttributes_Set",
                        column: x => x.AttributeSetId,
                        principalTable: "AttributeSets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductAttributeNumbers",
                columns: table => new
                {
                    ProductId = table.Column<string>(type: "varchar(50)", nullable: false),
                    AttributeId = table.Column<int>(type: "int", nullable: false),
                    NumericValue = table.Column<decimal>(type: "decimal(18,4)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductAttributeNumbers", x => new { x.ProductId, x.AttributeId });
                    table.ForeignKey(
                        name: "FK_ProductAttributeNumbers_Attribute",
                        column: x => x.AttributeId,
                        principalTable: "Attributes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductAttributeNumbers_Product",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductAttributeOptions",
                columns: table => new
                {
                    ProductId = table.Column<string>(type: "varchar(50)", nullable: false),
                    AttributeId = table.Column<int>(type: "int", nullable: false),
                    OptionId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductAttributeOptions", x => new { x.ProductId, x.AttributeId, x.OptionId });
                    table.ForeignKey(
                        name: "FK_ProductAttributeOptions_Attribute",
                        column: x => x.AttributeId,
                        principalTable: "Attributes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductAttributeOptions_Option",
                        column: x => x.OptionId,
                        principalTable: "AttributeOptions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductAttributeOptions_Product",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ColorOptionId",
                table: "ProductVariants",
                column: "ColorOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductSkus_SizeOptionId",
                table: "ProductSkus",
                column: "SizeOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_AttributeSetId",
                table: "Products",
                column: "AttributeSetId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_DisplayAttributes_Json",
                table: "Products",
                sql: "ISJSON(DisplayAttributesJson) = 1");

            migrationBuilder.CreateIndex(
                name: "IX_AttributeGroups_Code",
                table: "AttributeGroups",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AttributeOptions_AttributeId_Slug",
                table: "AttributeOptions",
                columns: new[] { "AttributeId", "Slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Attributes_Code",
                table: "Attributes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Attributes_GroupId",
                table: "Attributes",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_AttributeSetAttributes_AttributeId",
                table: "AttributeSetAttributes",
                column: "AttributeId");

            migrationBuilder.CreateIndex(
                name: "IX_AttributeSets_Code",
                table: "AttributeSets",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PAN_Attr_Value",
                table: "ProductAttributeNumbers",
                columns: new[] { "AttributeId", "NumericValue" });

            migrationBuilder.CreateIndex(
                name: "IX_PAO_Attr_Option_Product",
                table: "ProductAttributeOptions",
                columns: new[] { "AttributeId", "OptionId", "ProductId" });

            migrationBuilder.CreateIndex(
                name: "IX_PAO_Option_Product",
                table: "ProductAttributeOptions",
                columns: new[] { "OptionId", "ProductId" });

            migrationBuilder.AddForeignKey(
                name: "FK_Products_AttributeSet",
                table: "Products",
                column: "AttributeSetId",
                principalTable: "AttributeSets",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductSkus_AttributeOptions_SizeOptionId",
                table: "ProductSkus",
                column: "SizeOptionId",
                principalTable: "AttributeOptions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductVariants_AttributeOptions_ColorOptionId",
                table: "ProductVariants",
                column: "ColorOptionId",
                principalTable: "AttributeOptions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_AttributeSet",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductSkus_AttributeOptions_SizeOptionId",
                table: "ProductSkus");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductVariants_AttributeOptions_ColorOptionId",
                table: "ProductVariants");

            migrationBuilder.DropTable(
                name: "AttributeSetAttributes");

            migrationBuilder.DropTable(
                name: "ProductAttributeNumbers");

            migrationBuilder.DropTable(
                name: "ProductAttributeOptions");

            migrationBuilder.DropTable(
                name: "AttributeSets");

            migrationBuilder.DropTable(
                name: "AttributeOptions");

            migrationBuilder.DropTable(
                name: "Attributes");

            migrationBuilder.DropTable(
                name: "AttributeGroups");

            migrationBuilder.DropIndex(
                name: "IX_ProductVariants_ColorOptionId",
                table: "ProductVariants");

            migrationBuilder.DropIndex(
                name: "IX_ProductSkus_SizeOptionId",
                table: "ProductSkus");

            migrationBuilder.DropIndex(
                name: "IX_Products_AttributeSetId",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_DisplayAttributes_Json",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ColorOptionId",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "SizeOptionId",
                table: "ProductSkus");

            migrationBuilder.DropColumn(
                name: "AttributeSetId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "DisplayAttributesJson",
                table: "Products");
        }
    }
}
