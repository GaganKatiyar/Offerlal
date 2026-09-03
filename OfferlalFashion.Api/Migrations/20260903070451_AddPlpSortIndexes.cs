using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OfferlalFashion.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPlpSortIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Products_Category_Featured_Rating",
                table: "Products",
                columns: new[] { "CategoryId", "IsFeatured", "Rating" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_CreatedAt",
                table: "Products",
                column: "CreatedAt",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_Products_Price",
                table: "Products",
                column: "Price");

            migrationBuilder.CreateIndex(
                name: "IX_Products_Rating_ReviewCount",
                table: "Products",
                columns: new[] { "Rating", "ReviewCount" },
                descending: new bool[0]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_Category_Featured_Rating",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_CreatedAt",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_Price",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_Rating_ReviewCount",
                table: "Products");
        }
    }
}
