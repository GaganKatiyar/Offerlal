/* =====================================================================
   ⚠  REFERENCE ONLY — DO NOT EDIT, DO NOT RUN.
   =====================================================================
   The database schema is now owned by EF Core migrations in
   OfferlalFashion.Api/Migrations/. This file is the historical
   hand-written schema it was originally scaffolded from, kept only
   for reference.

   To change the schema:
       1. Edit the entity classes in OfferlalFashion.Api/Models/
       2. dotnet ef migrations add <DescriptiveName>
       3. dotnet ef database update

   To rebuild a dev database from scratch:
       dotnet ef database drop --force
       dotnet ef database update
       sqlcmd -S . -E -d Offerlal_Dev -i "database/seed.sql"

   seed.sql IS still live and used by the rebuild step above.
   =====================================================================

   Offerlal Fashion — Database Schema (Microsoft SQL Server / T-SQL)
   =====================================================================
   Mirrors the TypeScript interfaces in src/app/core/models/ exactly, so
   the future ASP.NET Core (or any) API layer can map 1:1 onto this
   schema without reshaping data on the way in/out.

   Design notes:
   - Primary keys are VARCHAR to match the string IDs already used
     throughout the front-end demo data (e.g. 'prod-001', 'cat-bridal-
     lehengas'), which keeps the eventual migration of existing demo
     data straightforward. Swap to UNIQUEIDENTIFIER/INT IDENTITY if you
     prefer generated keys instead.
   - Array-typed fields on the TS models (tags, care instructions,
     sizes) that are simple, non-relational display lists are stored as
     JSON in an NVARCHAR(MAX) column (validated with ISJSON). Fields
     that are genuinely relational/filterable (occasions, customization
     options, images, order items) get their own table.
   - Orders snapshot the shipping/billing address at the time of
     purchase (shipping_/billing_ prefixed columns) rather than
     pointing at the live addresses table, so editing a saved address
     later never rewrites order history.
   - rating / review_count / total_orders / total_spend are cached
     (denormalized) columns, recomputed by the application layer —
     matches how the front-end's DemoDataStoreService already derives
     customer segment/spend from orders.
   ===================================================================== */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- =====================================================================
-- Catalog: categories, occasions, budget tiers
-- =====================================================================

CREATE TABLE dbo.Categories (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    Slug            VARCHAR(120)    NOT NULL UNIQUE,
    Name            NVARCHAR(150)   NOT NULL,
    Description     NVARCHAR(MAX)   NOT NULL,
    HeroImageUrl    NVARCHAR(500)   NOT NULL,
    ThumbnailUrl    NVARCHAR(500)   NOT NULL,
    ParentId        VARCHAR(50)     NULL,
    DisplayOrder    INT             NOT NULL DEFAULT 0,
    SeoTitle        NVARCHAR(200)   NULL,
    SeoDescription  NVARCHAR(400)   NULL,
    SeoKeywords     NVARCHAR(500)   NULL,      -- comma-separated
    CONSTRAINT FK_Categories_Parent FOREIGN KEY (ParentId) REFERENCES dbo.Categories(Id)
);
GO

CREATE TABLE dbo.Occasions (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    Slug            VARCHAR(120)    NOT NULL UNIQUE,
    Name            NVARCHAR(150)   NOT NULL,
    ImageUrl        NVARCHAR(500)   NOT NULL,
    Description     NVARCHAR(500)   NOT NULL
);
GO

CREATE TABLE dbo.BudgetTiers (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    Label           NVARCHAR(100)   NOT NULL,
    MinPrice        DECIMAL(10,2)   NOT NULL,
    MaxPrice        DECIMAL(10,2)   NULL,       -- NULL = open-ended ("15,000+")
    ImageUrl        NVARCHAR(500)   NOT NULL
);
GO

-- =====================================================================
-- Products
-- =====================================================================

CREATE TABLE dbo.Products (
    Id                      VARCHAR(50)     NOT NULL PRIMARY KEY,
    Slug                    VARCHAR(200)    NOT NULL UNIQUE,
    Name                    NVARCHAR(250)   NOT NULL,
    Sku                     VARCHAR(50)     NOT NULL UNIQUE,
    CategoryId              VARCHAR(50)     NOT NULL,
    SubCategory             NVARCHAR(100)   NULL,
    Description             NVARCHAR(MAX)   NOT NULL,
    ShortDescription        NVARCHAR(500)   NOT NULL,
    Fabric                  NVARCHAR(200)   NOT NULL,
    WorkDetails             NVARCHAR(500)   NOT NULL,
    BlouseDetails           NVARCHAR(500)   NULL,
    DupattaDetails          NVARCHAR(500)   NULL,
    AvailableSizes          NVARCHAR(300)   NOT NULL DEFAULT '[]',   -- JSON string[], e.g. ["S","M","L","Custom"]
    Price                   DECIMAL(10,2)   NOT NULL,
    CompareAtPrice          DECIMAL(10,2)   NULL,
    Currency                CHAR(3)         NOT NULL DEFAULT 'INR',
    Rating                  DECIMAL(3,2)    NOT NULL DEFAULT 0,      -- cached avg, recompute from Reviews
    ReviewCount             INT             NOT NULL DEFAULT 0,      -- cached count, recompute from Reviews
    StockStatus             VARCHAR(20)     NOT NULL DEFAULT 'in-stock'
        CHECK (StockStatus IN ('in-stock','low-stock','out-of-stock','made-to-order')),
    IsBestseller            BIT             NOT NULL DEFAULT 0,
    IsNewArrival            BIT             NOT NULL DEFAULT 0,
    IsFeatured              BIT             NOT NULL DEFAULT 0,
    IsBridal                BIT             NOT NULL DEFAULT 0,
    CareInstructions        NVARCHAR(1000)  NOT NULL DEFAULT '[]',   -- JSON string[]
    DeliveryStandardDays    INT             NOT NULL DEFAULT 7,
    DeliveryExpressDays     INT             NULL,
    WeightGrams             INT             NULL,
    Tags                    NVARCHAR(1000)  NOT NULL DEFAULT '[]',   -- JSON string[]
    SeoTitle                NVARCHAR(200)   NULL,
    SeoDescription          NVARCHAR(400)   NULL,
    SeoKeywords             NVARCHAR(500)   NULL,                    -- comma-separated
    CreatedAt               DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt               DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Products_Category FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(Id),
    CONSTRAINT CK_Products_AvailableSizes_Json CHECK (ISJSON(AvailableSizes) = 1),
    CONSTRAINT CK_Products_CareInstructions_Json CHECK (ISJSON(CareInstructions) = 1),
    CONSTRAINT CK_Products_Tags_Json CHECK (ISJSON(Tags) = 1)
);
GO
CREATE INDEX IX_Products_CategoryId ON dbo.Products(CategoryId);
CREATE INDEX IX_Products_Flags ON dbo.Products(IsBestseller, IsNewArrival, IsFeatured, IsBridal);
GO

-- Occasion tags are filterable (PLP filters by occasion), so they get a junction table.
CREATE TABLE dbo.ProductOccasions (
    ProductId       VARCHAR(50)     NOT NULL,
    OccasionId      VARCHAR(50)     NOT NULL,
    CONSTRAINT PK_ProductOccasions PRIMARY KEY (ProductId, OccasionId),
    CONSTRAINT FK_ProductOccasions_Product FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id) ON DELETE CASCADE,
    CONSTRAINT FK_ProductOccasions_Occasion FOREIGN KEY (OccasionId) REFERENCES dbo.Occasions(Id)
);
GO

CREATE TABLE dbo.ProductVariants (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    ProductId       VARCHAR(50)     NOT NULL,
    Color           NVARCHAR(80)    NOT NULL,
    ColorHex        CHAR(7)         NOT NULL,      -- '#RRGGBB'
    CONSTRAINT FK_ProductVariants_Product FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id) ON DELETE CASCADE
);
GO
CREATE INDEX IX_ProductVariants_ProductId ON dbo.ProductVariants(ProductId);
GO

CREATE TABLE dbo.ProductImages (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    VariantId       VARCHAR(50)     NOT NULL,
    Url             NVARCHAR(500)   NOT NULL,
    Alt             NVARCHAR(250)   NOT NULL,
    IsPrimary       BIT             NOT NULL DEFAULT 0,
    SortOrder       INT             NOT NULL DEFAULT 0,
    CONSTRAINT FK_ProductImages_Variant FOREIGN KEY (VariantId) REFERENCES dbo.ProductVariants(Id) ON DELETE CASCADE
);
GO
CREATE INDEX IX_ProductImages_VariantId ON dbo.ProductImages(VariantId);
GO

CREATE TABLE dbo.ProductSkus (
    Sku             VARCHAR(50)     NOT NULL PRIMARY KEY,
    VariantId       VARCHAR(50)     NOT NULL,
    Size            VARCHAR(20)     NOT NULL,
    Stock           INT             NOT NULL DEFAULT 0,
    ReservedStock   INT             NOT NULL DEFAULT 0,     -- for inventory admin: fast/slow/dead-stock views
    CONSTRAINT FK_ProductSkus_Variant FOREIGN KEY (VariantId) REFERENCES dbo.ProductVariants(Id) ON DELETE CASCADE
);
GO
CREATE INDEX IX_ProductSkus_VariantId ON dbo.ProductSkus(VariantId);
GO

CREATE TABLE dbo.CustomizationOptions (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    ProductId       VARCHAR(50)     NOT NULL,
    Type            VARCHAR(30)     NOT NULL
        CHECK (Type IN ('blouse-stitching','dupatta-style','fall-pico','custom-size','petticoat','sleeve','neck-design','padding','can-can')),
    Label           NVARCHAR(200)   NOT NULL,
    PriceDelta      DECIMAL(10,2)   NOT NULL DEFAULT 0,
    Description     NVARCHAR(400)   NULL,
    CONSTRAINT FK_CustomizationOptions_Product FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id) ON DELETE CASCADE
);
GO
CREATE INDEX IX_CustomizationOptions_ProductId ON dbo.CustomizationOptions(ProductId);
GO

-- =====================================================================
-- Customers, addresses, size profiles
-- =====================================================================

CREATE TABLE dbo.Customers (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    FirstName       NVARCHAR(100)   NOT NULL,
    LastName        NVARCHAR(100)   NOT NULL,
    Email           VARCHAR(255)    NOT NULL UNIQUE,
    PasswordHash    VARCHAR(255)    NOT NULL,          -- store a real hash (e.g. bcrypt/PBKDF2), never plaintext
    Phone           VARCHAR(20)     NOT NULL,
    City            NVARCHAR(100)   NULL,
    State           NVARCHAR(100)   NULL,
    RegisteredAt    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    Segment         VARCHAR(20)     NOT NULL DEFAULT 'New'
        CHECK (Segment IN ('New','Repeat','VIP','Bridal','High-Value')),
    TotalOrders     INT             NOT NULL DEFAULT 0,   -- cached, recompute from Orders
    TotalSpend      DECIMAL(12,2)   NOT NULL DEFAULT 0,   -- cached, recompute from Orders
    AvatarUrl       NVARCHAR(500)   NULL
);
GO
CREATE INDEX IX_Customers_Segment ON dbo.Customers(Segment);
GO

CREATE TABLE dbo.Addresses (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    CustomerId      VARCHAR(50)     NOT NULL,
    Label           VARCHAR(10)     NOT NULL DEFAULT 'Home' CHECK (Label IN ('Home','Work','Other')),
    FullName        NVARCHAR(150)   NOT NULL,
    Phone           VARCHAR(20)     NOT NULL,
    Line1           NVARCHAR(250)   NOT NULL,
    Line2           NVARCHAR(250)   NULL,
    City            NVARCHAR(100)   NOT NULL,
    State           NVARCHAR(100)   NOT NULL,
    Pincode         VARCHAR(10)     NOT NULL,
    IsDefault       BIT             NOT NULL DEFAULT 0,
    CONSTRAINT FK_Addresses_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(Id) ON DELETE CASCADE
);
GO
CREATE INDEX IX_Addresses_CustomerId ON dbo.Addresses(CustomerId);
GO

CREATE TABLE dbo.SizeProfiles (
    CustomerId      VARCHAR(50)     NOT NULL PRIMARY KEY,   -- 1:1 with Customers
    Bust            DECIMAL(5,2)    NOT NULL,
    Waist           DECIMAL(5,2)    NOT NULL,
    Hip             DECIMAL(5,2)    NOT NULL,
    Shoulder        DECIMAL(5,2)    NOT NULL,
    BlouseLength    DECIMAL(5,2)    NOT NULL,
    SleeveLength    DECIMAL(5,2)    NOT NULL,
    Height          DECIMAL(5,2)    NOT NULL,
    LehengaLength   DECIMAL(5,2)    NOT NULL,
    Unit            VARCHAR(3)      NOT NULL DEFAULT 'in' CHECK (Unit IN ('in','cm')),
    PreferredSize   VARCHAR(20)     NOT NULL,
    Notes           NVARCHAR(500)   NULL,
    UpdatedAt       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_SizeProfiles_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(Id) ON DELETE CASCADE
);
GO

-- =====================================================================
-- Reviews
-- =====================================================================

CREATE TABLE dbo.Reviews (
    Id                  VARCHAR(50)     NOT NULL PRIMARY KEY,
    ProductId           VARCHAR(50)     NOT NULL,
    CustomerId          VARCHAR(50)     NOT NULL,
    CustomerName        NVARCHAR(150)   NOT NULL,   -- snapshot at time of review
    CustomerCity        NVARCHAR(100)   NULL,
    Rating              TINYINT         NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Title               NVARCHAR(200)   NOT NULL,
    Comment             NVARCHAR(MAX)   NOT NULL,
    VerifiedPurchase    BIT             NOT NULL DEFAULT 0,
    CreatedAt           DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    HelpfulCount        INT             NOT NULL DEFAULT 0,
    CONSTRAINT FK_Reviews_Product FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Reviews_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(Id)
);
GO
CREATE INDEX IX_Reviews_ProductId ON dbo.Reviews(ProductId);
CREATE INDEX IX_Reviews_CustomerId ON dbo.Reviews(CustomerId);
GO

CREATE TABLE dbo.ReviewImages (
    Id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ReviewId        VARCHAR(50)     NOT NULL,
    Url             NVARCHAR(500)   NOT NULL,
    CONSTRAINT FK_ReviewImages_Review FOREIGN KEY (ReviewId) REFERENCES dbo.Reviews(Id) ON DELETE CASCADE
);
GO

-- =====================================================================
-- Coupons
-- =====================================================================

CREATE TABLE dbo.Coupons (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    Code            VARCHAR(30)     NOT NULL UNIQUE,
    Description     NVARCHAR(300)   NOT NULL,
    Type            VARCHAR(20)     NOT NULL CHECK (Type IN ('percent','flat','free-shipping')),
    Value           DECIMAL(10,2)   NOT NULL DEFAULT 0,
    MinOrderValue   DECIMAL(10,2)   NULL,
    MaxDiscount     DECIMAL(10,2)   NULL,
    ValidFrom       DATETIME2       NOT NULL,
    ValidTo         DATETIME2       NOT NULL,
    UsageLimit      INT             NULL,
    UsedCount       INT             NOT NULL DEFAULT 0,
    IsActive        BIT             NOT NULL DEFAULT 1
);
GO
CREATE INDEX IX_Coupons_Code ON dbo.Coupons(Code);
GO

CREATE TABLE dbo.CouponCategories (
    CouponId        VARCHAR(50)     NOT NULL,
    CategoryId      VARCHAR(50)     NOT NULL,
    CONSTRAINT PK_CouponCategories PRIMARY KEY (CouponId, CategoryId),
    CONSTRAINT FK_CouponCategories_Coupon FOREIGN KEY (CouponId) REFERENCES dbo.Coupons(Id) ON DELETE CASCADE,
    CONSTRAINT FK_CouponCategories_Category FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(Id)
);
GO

-- =====================================================================
-- Orders (addresses are snapshotted, not FK'd, so history never changes retroactively)
-- =====================================================================

CREATE TABLE dbo.Orders (
    Id                      VARCHAR(50)     NOT NULL PRIMARY KEY,
    OrderNumber             VARCHAR(30)     NOT NULL UNIQUE,
    CustomerId              VARCHAR(50)     NOT NULL,
    Subtotal                DECIMAL(12,2)   NOT NULL,
    Discount                DECIMAL(12,2)   NOT NULL DEFAULT 0,
    CouponCode              VARCHAR(30)     NULL,
    ShippingFee             DECIMAL(10,2)   NOT NULL DEFAULT 0,
    Tax                     DECIMAL(10,2)   NOT NULL DEFAULT 0,
    Total                   DECIMAL(12,2)   NOT NULL,
    Status                  VARCHAR(20)     NOT NULL DEFAULT 'Placed'
        CHECK (Status IN ('Placed','Confirmed','Processing','Customized','Packed','Shipped',
                           'OutForDelivery','Delivered','Cancelled','ReturnRequested','Returned',
                           'Exchanged','Refunded')),
    -- Shipping address snapshot
    ShipFullName            NVARCHAR(150)   NOT NULL,
    ShipPhone               VARCHAR(20)     NOT NULL,
    ShipLine1               NVARCHAR(250)   NOT NULL,
    ShipLine2               NVARCHAR(250)   NULL,
    ShipCity                NVARCHAR(100)   NOT NULL,
    ShipState               NVARCHAR(100)   NOT NULL,
    ShipPincode             VARCHAR(10)     NOT NULL,
    -- Billing address snapshot
    BillFullName            NVARCHAR(150)   NOT NULL,
    BillPhone                VARCHAR(20)     NOT NULL,
    BillLine1                NVARCHAR(250)   NOT NULL,
    BillLine2                NVARCHAR(250)   NULL,
    BillCity                 NVARCHAR(100)   NOT NULL,
    BillState                NVARCHAR(100)   NOT NULL,
    BillPincode               VARCHAR(10)     NOT NULL,
    PaymentMethod            VARCHAR(20)     NOT NULL CHECK (PaymentMethod IN ('UPI','Card','NetBanking','Wallet','COD')),
    PaymentStatus            VARCHAR(20)     NOT NULL DEFAULT 'Pending' CHECK (PaymentStatus IN ('Paid','Pending','Refunded')),
    PlacedAt                 DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    ExpectedDeliveryDate     DATE            NOT NULL,
    TrackingNumber           VARCHAR(50)     NULL,
    Carrier                  NVARCHAR(100)   NULL,
    CONSTRAINT FK_Orders_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(Id)
);
GO
CREATE INDEX IX_Orders_CustomerId ON dbo.Orders(CustomerId);
CREATE INDEX IX_Orders_Status ON dbo.Orders(Status);
CREATE INDEX IX_Orders_PlacedAt ON dbo.Orders(PlacedAt);
GO

CREATE TABLE dbo.OrderItems (
    Id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    OrderId         VARCHAR(50)     NOT NULL,
    ProductId       VARCHAR(50)     NOT NULL,   -- not FK'd with cascade delete: order history must survive product deletion
    Name            NVARCHAR(250)   NOT NULL,   -- snapshot
    ImageUrl        NVARCHAR(500)   NOT NULL,   -- snapshot
    Sku             VARCHAR(50)     NOT NULL,
    Size            VARCHAR(20)     NOT NULL,
    Color           NVARCHAR(80)    NOT NULL,
    Quantity        INT             NOT NULL,
    UnitPrice       DECIMAL(10,2)   NOT NULL,
    LineTotal       DECIMAL(12,2)   NOT NULL,
    Customizations  NVARCHAR(1000)  NULL,        -- JSON string[] of applied customization labels
    CONSTRAINT FK_OrderItems_Order FOREIGN KEY (OrderId) REFERENCES dbo.Orders(Id) ON DELETE CASCADE
);
GO
CREATE INDEX IX_OrderItems_OrderId ON dbo.OrderItems(OrderId);
GO

CREATE TABLE dbo.OrderStatusHistory (
    Id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    OrderId         VARCHAR(50)     NOT NULL,
    Status          VARCHAR(20)     NOT NULL,
    Timestamp       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    Note            NVARCHAR(500)   NULL,
    CONSTRAINT FK_OrderStatusHistory_Order FOREIGN KEY (OrderId) REFERENCES dbo.Orders(Id) ON DELETE CASCADE
);
GO
CREATE INDEX IX_OrderStatusHistory_OrderId ON dbo.OrderStatusHistory(OrderId);
GO

-- =====================================================================
-- Cart & wishlist (persisted server-side; front-end currently uses
-- localStorage — these tables let a logged-in customer's cart/wishlist
-- follow them across devices once the API is wired up)
-- =====================================================================

CREATE TABLE dbo.CartItems (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    CustomerId      VARCHAR(50)     NOT NULL,
    ProductId       VARCHAR(50)     NOT NULL,
    VariantId       VARCHAR(50)     NOT NULL,
    Sku             VARCHAR(50)     NOT NULL,
    Size            VARCHAR(20)     NOT NULL,
    Color           NVARCHAR(80)    NOT NULL,
    Quantity        INT             NOT NULL DEFAULT 1,
    UnitPrice       DECIMAL(10,2)   NOT NULL,
    AddedAt         DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CartItems_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(Id) ON DELETE CASCADE,
    CONSTRAINT FK_CartItems_Product FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id)
);
GO
CREATE INDEX IX_CartItems_CustomerId ON dbo.CartItems(CustomerId);
GO

CREATE TABLE dbo.CartItemCustomizations (
    Id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CartItemId      VARCHAR(50)     NOT NULL,
    OptionId        VARCHAR(50)     NOT NULL,
    Label           NVARCHAR(200)   NOT NULL,
    PriceDelta      DECIMAL(10,2)   NOT NULL DEFAULT 0,
    CONSTRAINT FK_CartItemCustomizations_CartItem FOREIGN KEY (CartItemId) REFERENCES dbo.CartItems(Id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.WishlistItems (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    CustomerId      VARCHAR(50)     NOT NULL,
    ProductId       VARCHAR(50)     NOT NULL,
    AddedAt         DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_WishlistItems_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.Customers(Id) ON DELETE CASCADE,
    CONSTRAINT FK_WishlistItems_Product FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_WishlistItems_CustomerProduct UNIQUE (CustomerId, ProductId)
);
GO
CREATE INDEX IX_WishlistItems_CustomerId ON dbo.WishlistItems(CustomerId);
GO

-- =====================================================================
-- Admin users (separate from Customers — matches the app's separate
-- admin login at /admin/login)
-- =====================================================================

CREATE TABLE dbo.AdminUsers (
    Id              VARCHAR(50)     NOT NULL PRIMARY KEY,
    Username        VARCHAR(50)     NOT NULL UNIQUE,
    PasswordHash    VARCHAR(255)    NOT NULL,
    Role            VARCHAR(20)     NOT NULL DEFAULT 'admin',
    CreatedAt       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* =====================================================================
   End of schema. Suggested next steps:
   1. Run this against a fresh database (e.g. `sqlcmd -S . -d OfferlalFashion -i schema.sql`,
      or via SSMS/Azure Data Studio).
   2. Seed it — the fastest path is a small script that reads the
      existing src/app/core/demo-data/ *.ts arrays and emits INSERT
      statements, so the real database starts out matching everything
      already in the app. Ask for this next if you want it.
   3. Stand up an API layer (ASP.NET Core Web API, or your stack of
      choice) with one controller per table group, then swap each
      feature service in src/app/core/services/ from reading
      DemoDataStoreService to calling HttpClient against that API —
      the service method signatures were designed to not need to
      change on the component side.
   ===================================================================== */
