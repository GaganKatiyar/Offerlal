using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OfferlalFashion.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdminUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Username = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "varchar(255)", unicode: false, maxLength: 255, nullable: false),
                    Role = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false, defaultValue: "admin"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BudgetTiers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MinPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    MaxPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BudgetTiers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Slug = table.Column<string>(type: "varchar(120)", unicode: false, maxLength: 120, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HeroImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ParentId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    SeoTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SeoDescription = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    SeoKeywords = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Categories_Parent",
                        column: x => x.ParentId,
                        principalTable: "Categories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Coupons",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Code = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Type = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Value = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    MinOrderValue = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    MaxDiscount = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    ValidFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ValidTo = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UsageLimit = table.Column<int>(type: "int", nullable: true),
                    UsedCount = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Coupons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "varchar(255)", unicode: false, maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "varchar(255)", unicode: false, maxLength: 255, nullable: false),
                    Phone = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    State = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RegisteredAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    Segment = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false, defaultValue: "New"),
                    TotalOrders = table.Column<int>(type: "int", nullable: false),
                    TotalSpend = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    AvatarUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Occasions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Slug = table.Column<string>(type: "varchar(120)", unicode: false, maxLength: 120, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Occasions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Slug = table.Column<string>(type: "varchar(200)", unicode: false, maxLength: 200, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Sku = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    CategoryId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    SubCategory = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ShortDescription = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Fabric = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    WorkDetails = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    BlouseDetails = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DupattaDetails = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AvailableSizes = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false, defaultValue: "[]"),
                    Price = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    CompareAtPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    Currency = table.Column<string>(type: "char(3)", unicode: false, fixedLength: true, maxLength: 3, nullable: false, defaultValue: "INR"),
                    Rating = table.Column<decimal>(type: "decimal(3,2)", nullable: false),
                    ReviewCount = table.Column<int>(type: "int", nullable: false),
                    StockStatus = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false, defaultValue: "in-stock"),
                    IsBestseller = table.Column<bool>(type: "bit", nullable: false),
                    IsNewArrival = table.Column<bool>(type: "bit", nullable: false),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false),
                    IsBridal = table.Column<bool>(type: "bit", nullable: false),
                    CareInstructions = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false, defaultValue: "[]"),
                    DeliveryStandardDays = table.Column<int>(type: "int", nullable: false, defaultValue: 7),
                    DeliveryExpressDays = table.Column<int>(type: "int", nullable: true),
                    WeightGrams = table.Column<int>(type: "int", nullable: true),
                    Tags = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false, defaultValue: "[]"),
                    SeoTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SeoDescription = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    SeoKeywords = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Products_Category",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CouponCategories",
                columns: table => new
                {
                    CouponId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    CategoryId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CouponCategories", x => new { x.CouponId, x.CategoryId });
                    table.ForeignKey(
                        name: "FK_CouponCategories_Category",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CouponCategories_Coupon",
                        column: x => x.CouponId,
                        principalTable: "Coupons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Addresses",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    CustomerId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Label = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false, defaultValue: "Home"),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Line1 = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Line2 = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    State = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Pincode = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Addresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Addresses_Customer",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    OrderNumber = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    CustomerId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Subtotal = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    Discount = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    CouponCode = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: true),
                    ShippingFee = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Tax = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Total = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false, defaultValue: "Placed"),
                    ShipFullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ShipPhone = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    ShipLine1 = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ShipLine2 = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ShipCity = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ShipState = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ShipPincode = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    BillFullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    BillPhone = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    BillLine1 = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    BillLine2 = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    BillCity = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    BillState = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    BillPincode = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    PaymentMethod = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    PaymentStatus = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false, defaultValue: "Pending"),
                    PlacedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    ExpectedDeliveryDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TrackingNumber = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    Carrier = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Orders_Customer",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SizeProfiles",
                columns: table => new
                {
                    CustomerId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Bust = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Waist = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Hip = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Shoulder = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    BlouseLength = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    SleeveLength = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Height = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    LehengaLength = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Unit = table.Column<string>(type: "varchar(3)", unicode: false, maxLength: 3, nullable: false, defaultValue: "in"),
                    PreferredSize = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SizeProfiles", x => x.CustomerId);
                    table.ForeignKey(
                        name: "FK_SizeProfiles_Customer",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CartItems",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    CustomerId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    ProductId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    VariantId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Sku = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Size = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Color = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    UnitPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CartItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CartItems_Customer",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CartItems_Product",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CustomizationOptions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    ProductId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Type = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PriceDelta = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomizationOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomizationOptions_Product",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductOccasions",
                columns: table => new
                {
                    ProductId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    OccasionId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductOccasions", x => new { x.ProductId, x.OccasionId });
                    table.ForeignKey(
                        name: "FK_ProductOccasions_Occasion",
                        column: x => x.OccasionId,
                        principalTable: "Occasions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductOccasions_Product",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductVariants",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    ProductId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Color = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ColorHex = table.Column<string>(type: "char(7)", unicode: false, fixedLength: true, maxLength: 7, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVariants_Product",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    ProductId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    CustomerId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CustomerCity = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Rating = table.Column<byte>(type: "tinyint", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VerifiedPurchase = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    HelpfulCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reviews_Customer",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Reviews_Product",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WishlistItems",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    CustomerId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    ProductId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WishlistItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WishlistItems_Customer",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WishlistItems_Product",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    ProductId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Sku = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Size = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Color = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    LineTotal = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    Customizations = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderItems_Order",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderStatusHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderStatusHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderStatusHistory_Order",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CartItemCustomizations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CartItemId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    OptionId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PriceDelta = table.Column<decimal>(type: "decimal(10,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CartItemCustomizations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CartItemCustomizations_CartItem",
                        column: x => x.CartItemId,
                        principalTable: "CartItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductImages",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    VariantId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Alt = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductImages_Variant",
                        column: x => x.VariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductSkus",
                columns: table => new
                {
                    Sku = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    VariantId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Size = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Stock = table.Column<int>(type: "int", nullable: false),
                    ReservedStock = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductSkus", x => x.Sku);
                    table.ForeignKey(
                        name: "FK_ProductSkus_Variant",
                        column: x => x.VariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReviewImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReviewId = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReviewImages_Review",
                        column: x => x.ReviewId,
                        principalTable: "Reviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Addresses_CustomerId",
                table: "Addresses",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_AdminUsers_Username",
                table: "AdminUsers",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CartItemCustomizations_CartItemId",
                table: "CartItemCustomizations",
                column: "CartItemId");

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_CustomerId",
                table: "CartItems",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_ProductId",
                table: "CartItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_ParentId",
                table: "Categories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Slug",
                table: "Categories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CouponCategories_CategoryId",
                table: "CouponCategories",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Coupons_Code",
                table: "Coupons",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Coupons_Code1",
                table: "Coupons",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Email",
                table: "Customers",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Customers_Segment",
                table: "Customers",
                column: "Segment");

            migrationBuilder.CreateIndex(
                name: "IX_CustomizationOptions_ProductId",
                table: "CustomizationOptions",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Occasions_Slug",
                table: "Occasions",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId",
                table: "OrderItems",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CustomerId",
                table: "Orders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderNumber",
                table: "Orders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_PlacedAt",
                table: "Orders",
                column: "PlacedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_Status",
                table: "Orders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatusHistory_OrderId",
                table: "OrderStatusHistory",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_VariantId",
                table: "ProductImages",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductOccasions_OccasionId",
                table: "ProductOccasions",
                column: "OccasionId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryId",
                table: "Products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_Flags",
                table: "Products",
                columns: new[] { "IsBestseller", "IsNewArrival", "IsFeatured", "IsBridal" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_Sku",
                table: "Products",
                column: "Sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_Slug",
                table: "Products",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductSkus_VariantId",
                table: "ProductSkus",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ProductId",
                table: "ProductVariants",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewImages_ReviewId",
                table: "ReviewImages",
                column: "ReviewId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_CustomerId",
                table: "Reviews",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ProductId",
                table: "Reviews",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_WishlistItems_CustomerId",
                table: "WishlistItems",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_WishlistItems_ProductId",
                table: "WishlistItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "UQ_WishlistItems_CustomerProduct",
                table: "WishlistItems",
                columns: new[] { "CustomerId", "ProductId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Addresses");

            migrationBuilder.DropTable(
                name: "AdminUsers");

            migrationBuilder.DropTable(
                name: "BudgetTiers");

            migrationBuilder.DropTable(
                name: "CartItemCustomizations");

            migrationBuilder.DropTable(
                name: "CouponCategories");

            migrationBuilder.DropTable(
                name: "CustomizationOptions");

            migrationBuilder.DropTable(
                name: "OrderItems");

            migrationBuilder.DropTable(
                name: "OrderStatusHistory");

            migrationBuilder.DropTable(
                name: "ProductImages");

            migrationBuilder.DropTable(
                name: "ProductOccasions");

            migrationBuilder.DropTable(
                name: "ProductSkus");

            migrationBuilder.DropTable(
                name: "ReviewImages");

            migrationBuilder.DropTable(
                name: "SizeProfiles");

            migrationBuilder.DropTable(
                name: "WishlistItems");

            migrationBuilder.DropTable(
                name: "CartItems");

            migrationBuilder.DropTable(
                name: "Coupons");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "Occasions");

            migrationBuilder.DropTable(
                name: "ProductVariants");

            migrationBuilder.DropTable(
                name: "Reviews");

            migrationBuilder.DropTable(
                name: "Customers");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "Categories");
        }
    }
}
