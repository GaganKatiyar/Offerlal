using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OfferlalFashion.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAuthTokensAndAdminFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_AdminUsers_Username",
                table: "AdminUsers",
                newName: "UQ_AdminUsers_Username");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "AdminUsers",
                type: "varchar(20)",
                unicode: false,
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(20)",
                oldUnicode: false,
                oldMaxLength: 20,
                oldDefaultValue: "admin");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "AdminUsers",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "(sysutcdatetime())");

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "AdminUsers",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "AdminUsers",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "AdminUsers",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastLoginAt",
                table: "AdminUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MustChangePassword",
                table: "AdminUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TokenHash = table.Column<string>(type: "char(64)", unicode: false, fixedLength: true, maxLength: 64, nullable: false),
                    SubjectId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    SubjectType = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RevokedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReplacedByTokenId = table.Column<int>(type: "int", nullable: true),
                    CreatedByIp = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Subject",
                table: "RefreshTokens",
                columns: new[] { "SubjectType", "SubjectId" });

            migrationBuilder.CreateIndex(
                name: "UQ_RefreshTokens_Hash",
                table: "RefreshTokens",
                column: "TokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "AdminUsers");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "AdminUsers");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "AdminUsers");

            migrationBuilder.DropColumn(
                name: "LastLoginAt",
                table: "AdminUsers");

            migrationBuilder.DropColumn(
                name: "MustChangePassword",
                table: "AdminUsers");

            migrationBuilder.RenameIndex(
                name: "UQ_AdminUsers_Username",
                table: "AdminUsers",
                newName: "IX_AdminUsers_Username");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "AdminUsers",
                type: "varchar(20)",
                unicode: false,
                maxLength: 20,
                nullable: false,
                defaultValue: "admin",
                oldClrType: typeof(string),
                oldType: "varchar(20)",
                oldUnicode: false,
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "AdminUsers",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "(sysutcdatetime())",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "SYSUTCDATETIME()");
        }
    }
}
