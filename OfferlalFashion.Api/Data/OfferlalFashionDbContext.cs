using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Data;

public partial class OfferlalFashionDbContext : DbContext
{
    public OfferlalFashionDbContext(DbContextOptions<OfferlalFashionDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Address> Addresses { get; set; }

    public virtual DbSet<AdminUser> AdminUsers { get; set; }

    public virtual DbSet<BudgetTier> BudgetTiers { get; set; }

    public virtual DbSet<CartItem> CartItems { get; set; }

    public virtual DbSet<CartItemCustomization> CartItemCustomizations { get; set; }

    public virtual DbSet<Brand> Brands { get; set; }

    public virtual DbSet<MediaAsset> MediaAssets { get; set; }

    public virtual DbSet<SizeChartMeasurement> SizeChartMeasurements { get; set; }

    public virtual DbSet<ContentPage> ContentPages { get; set; }

    public virtual DbSet<SectionType> SectionTypes { get; set; }

    public virtual DbSet<PageSection> PageSections { get; set; }

    public virtual DbSet<PageSectionItem> PageSectionItems { get; set; }

    public virtual DbSet<ProductRule> ProductRules { get; set; }

    public virtual DbSet<PageRevision> PageRevisions { get; set; }

    public virtual DbSet<AttributeGroup> AttributeGroups { get; set; }

    public virtual DbSet<CatalogAttribute> CatalogAttributes { get; set; }

    public virtual DbSet<AttributeOption> AttributeOptions { get; set; }

    public virtual DbSet<AttributeSet> AttributeSets { get; set; }

    public virtual DbSet<AttributeSetAttribute> AttributeSetAttributes { get; set; }

    public virtual DbSet<ProductAttributeOption> ProductAttributeOptions { get; set; }

    public virtual DbSet<ProductAttributeNumber> ProductAttributeNumbers { get; set; }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<Coupon> Coupons { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<CustomizationOption> CustomizationOptions { get; set; }

    public virtual DbSet<Occasion> Occasions { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderItem> OrderItems { get; set; }

    public virtual DbSet<OrderStatusHistory> OrderStatusHistories { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<ProductImage> ProductImages { get; set; }

    public virtual DbSet<ProductSku> ProductSkus { get; set; }

    public virtual DbSet<ProductVariant> ProductVariants { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<ReviewImage> ReviewImages { get; set; }

    public virtual DbSet<SizeProfile> SizeProfiles { get; set; }

    public virtual DbSet<WishlistItem> WishlistItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Address>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.CustomerId, "IX_Addresses_CustomerId");

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.CustomerId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.FullName).HasMaxLength(150);
            entity.Property(e => e.Label)
                .HasMaxLength(10)
                .IsUnicode(false)
                .HasDefaultValue("Home");
            entity.Property(e => e.Line1).HasMaxLength(250);
            entity.Property(e => e.Line2).HasMaxLength(250);
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Pincode)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.State).HasMaxLength(100);

            entity.HasOne(d => d.Customer).WithMany(p => p.Addresses)
                .HasForeignKey(d => d.CustomerId)
                .HasConstraintName("FK_Addresses_Customer");
        });

        modelBuilder.Entity<AdminUser>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.Username).IsUnique();

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Role)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("admin");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

        modelBuilder.Entity<BudgetTier>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.Label).HasMaxLength(100);
            entity.Property(e => e.MaxPrice).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.MinPrice).HasColumnType("decimal(10, 2)");
        });

        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.CustomerId, "IX_CartItems_CustomerId");

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.AddedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Color).HasMaxLength(80);
            entity.Property(e => e.CustomerId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ProductId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Quantity).HasDefaultValue(1);
            entity.Property(e => e.Size)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Sku)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.VariantId)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.Customer).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.CustomerId)
                .HasConstraintName("FK_CartItems_Customer");

            entity.HasOne(d => d.Product).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CartItems_Product");
        });

        modelBuilder.Entity<CartItemCustomization>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.CartItemId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Label).HasMaxLength(200);
            entity.Property(e => e.OptionId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.PriceDelta).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.CartItem).WithMany(p => p.CartItemCustomizations)
                .HasForeignKey(d => d.CartItemId)
                .HasConstraintName("FK_CartItemCustomizations_CartItem");
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.Slug).IsUnique();

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.HeroImageUrl).HasMaxLength(500);
            entity.Property(e => e.Name).HasMaxLength(150);
            entity.Property(e => e.ParentId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.SeoDescription).HasMaxLength(400);
            entity.Property(e => e.SeoKeywords).HasMaxLength(500);
            entity.Property(e => e.SeoTitle).HasMaxLength(200);
            entity.Property(e => e.Slug)
                .HasMaxLength(120)
                .IsUnicode(false);
            entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);
            entity.Property(e => e.Path)
                .HasMaxLength(400)
                .IsUnicode(false)
                .HasDefaultValue("");
            entity.Property(e => e.Level).HasDefaultValue((byte)0);
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            // Descendant lookups are "WHERE Path LIKE '/parent/%'" — index the path.
            entity.HasIndex(e => e.Path);

            entity.HasOne(d => d.Parent).WithMany(p => p.InverseParent)
                .HasForeignKey(d => d.ParentId)
                .HasConstraintName("FK_Categories_Parent");

            entity.HasIndex(e => e.HeroImageAssetId, "IX_Categories_HeroImageAssetId");
            entity.HasIndex(e => e.ThumbnailAssetId, "IX_Categories_ThumbnailAssetId");

            entity.HasOne<MediaAsset>().WithMany()
                .HasForeignKey(d => d.HeroImageAssetId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_Categories_HeroImageAsset");

            entity.HasOne<MediaAsset>().WithMany()
                .HasForeignKey(d => d.ThumbnailAssetId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_Categories_ThumbnailAsset");
        });

        ConfigureAttributeSystem(modelBuilder);

        modelBuilder.Entity<Brand>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.Slug).IsUnique();

            entity.Property(e => e.Slug)
                .HasMaxLength(120)
                .IsUnicode(false);
            entity.Property(e => e.Name).HasMaxLength(150);
            entity.Property(e => e.Description).HasDefaultValue("");
            entity.Property(e => e.LogoUrl).HasMaxLength(500);
            entity.Property(e => e.BannerUrl).HasMaxLength(500);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.SeoDescription).HasMaxLength(400);
            entity.Property(e => e.SeoKeywords).HasMaxLength(500);
            entity.Property(e => e.SeoTitle).HasMaxLength(200);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasIndex(e => e.LogoAssetId, "IX_Brands_LogoAssetId");

            entity.HasOne<MediaAsset>().WithMany()
                .HasForeignKey(d => d.LogoAssetId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_Brands_LogoAsset");
        });

        modelBuilder.Entity<Coupon>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.Code, "IX_Coupons_Code");

            entity.HasIndex(e => e.Code).IsUnique();

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Code)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.Description).HasMaxLength(300);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.MaxDiscount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.MinOrderValue).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Type)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Value).HasColumnType("decimal(10, 2)");

            entity.HasMany(d => d.Categories).WithMany(p => p.Coupons)
                .UsingEntity<Dictionary<string, object>>(
                    "CouponCategory",
                    r => r.HasOne<Category>().WithMany()
                        .HasForeignKey("CategoryId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_CouponCategories_Category"),
                    l => l.HasOne<Coupon>().WithMany()
                        .HasForeignKey("CouponId")
                        .HasConstraintName("FK_CouponCategories_Coupon"),
                    j =>
                    {
                        j.HasKey("CouponId", "CategoryId");
                        j.ToTable("CouponCategories");
                        j.IndexerProperty<string>("CouponId")
                            .HasMaxLength(50)
                            .IsUnicode(false);
                        j.IndexerProperty<string>("CategoryId")
                            .HasMaxLength(50)
                            .IsUnicode(false);
                    });
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.Segment, "IX_Customers_Segment");

            entity.HasIndex(e => e.Email).IsUnique();

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.AvatarUrl).HasMaxLength(500);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.FirstName).HasMaxLength(100);
            entity.Property(e => e.LastName).HasMaxLength(100);
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.RegisteredAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Segment)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("New");
            entity.Property(e => e.State).HasMaxLength(100);
            entity.Property(e => e.TotalSpend).HasColumnType("decimal(12, 2)");
        });

        modelBuilder.Entity<CustomizationOption>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.ProductId, "IX_CustomizationOptions_ProductId");

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Description).HasMaxLength(400);
            entity.Property(e => e.Label).HasMaxLength(200);
            entity.Property(e => e.PriceDelta).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.ProductId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Type)
                .HasMaxLength(30)
                .IsUnicode(false);

            entity.HasOne(d => d.Product).WithMany(p => p.CustomizationOptions)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("FK_CustomizationOptions_Product");
        });

        modelBuilder.Entity<Occasion>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.Slug).IsUnique();

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.Name).HasMaxLength(150);
            entity.Property(e => e.Slug)
                .HasMaxLength(120)
                .IsUnicode(false);

            entity.HasIndex(e => e.ImageAssetId, "IX_Occasions_ImageAssetId");

            entity.HasOne<MediaAsset>().WithMany()
                .HasForeignKey(d => d.ImageAssetId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_Occasions_ImageAsset");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.CustomerId, "IX_Orders_CustomerId");

            entity.HasIndex(e => e.PlacedAt, "IX_Orders_PlacedAt");

            entity.HasIndex(e => e.Status, "IX_Orders_Status");

            entity.HasIndex(e => e.OrderNumber).IsUnique();

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.BillCity).HasMaxLength(100);
            entity.Property(e => e.BillFullName).HasMaxLength(150);
            entity.Property(e => e.BillLine1).HasMaxLength(250);
            entity.Property(e => e.BillLine2).HasMaxLength(250);
            entity.Property(e => e.BillPhone)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.BillPincode)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.BillState).HasMaxLength(100);
            entity.Property(e => e.Carrier).HasMaxLength(100);
            entity.Property(e => e.CouponCode)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.CustomerId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Discount).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.OrderNumber)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Pending");
            entity.Property(e => e.PlacedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.ShipCity).HasMaxLength(100);
            entity.Property(e => e.ShipFullName).HasMaxLength(150);
            entity.Property(e => e.ShipLine1).HasMaxLength(250);
            entity.Property(e => e.ShipLine2).HasMaxLength(250);
            entity.Property(e => e.ShipPhone)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.ShipPincode)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.ShipState).HasMaxLength(100);
            entity.Property(e => e.ShippingFee).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Placed");
            entity.Property(e => e.Subtotal).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.Tax).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Total).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.TrackingNumber)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.Customer).WithMany(p => p.Orders)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Orders_Customer");
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.OrderId, "IX_OrderItems_OrderId");

            entity.Property(e => e.Color).HasMaxLength(80);
            entity.Property(e => e.Customizations).HasMaxLength(1000);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.LineTotal).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.Name).HasMaxLength(250);
            entity.Property(e => e.OrderId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ProductId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Size)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Sku)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(10, 2)");

            entity.HasOne(d => d.Order).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.OrderId)
                .HasConstraintName("FK_OrderItems_Order");
        });

        modelBuilder.Entity<OrderStatusHistory>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.ToTable("OrderStatusHistory");

            entity.HasIndex(e => e.OrderId, "IX_OrderStatusHistory_OrderId");

            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.OrderId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Timestamp).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Order).WithMany(p => p.OrderStatusHistories)
                .HasForeignKey(d => d.OrderId)
                .HasConstraintName("FK_OrderStatusHistory_Order");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.CategoryId, "IX_Products_CategoryId");

            entity.HasIndex(e => new { e.IsBestseller, e.IsNewArrival, e.IsFeatured, e.IsBridal }, "IX_Products_Flags");

            // PLP sort support. Every list query orders by one of these and
            // then pages, so without a matching index SQL Server sorts the
            // whole filtered set on each page request. Cheap at 60 products,
            // the difference between fast and unusable at a few thousand.
            entity.HasIndex(e => new { e.CategoryId, e.IsFeatured, e.Rating }, "IX_Products_Category_Featured_Rating");
            entity.HasIndex(e => e.CreatedAt, "IX_Products_CreatedAt").IsDescending();
            entity.HasIndex(e => e.Price, "IX_Products_Price");
            entity.HasIndex(e => new { e.Rating, e.ReviewCount }, "IX_Products_Rating_ReviewCount").IsDescending();

            entity.HasIndex(e => e.Slug).IsUnique();

            entity.HasIndex(e => e.Sku).IsUnique();

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.AvailableSizes)
                .HasMaxLength(300)
                .HasDefaultValue("[]");
            entity.Property(e => e.BlouseDetails).HasMaxLength(500);
            entity.Property(e => e.CareInstructions)
                .HasMaxLength(1000)
                .HasDefaultValue("[]");
            entity.Property(e => e.CategoryId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CompareAtPrice).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Currency)
                .HasMaxLength(3)
                .IsUnicode(false)
                .HasDefaultValue("INR")
                .IsFixedLength();
            entity.Property(e => e.DeliveryStandardDays).HasDefaultValue(7);
            entity.Property(e => e.DupattaDetails).HasMaxLength(500);
            entity.Property(e => e.Fabric).HasMaxLength(200);
            entity.Property(e => e.Name).HasMaxLength(250);
            entity.Property(e => e.Price).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Rating).HasColumnType("decimal(3, 2)");
            entity.Property(e => e.SeoDescription).HasMaxLength(400);
            entity.Property(e => e.SeoKeywords).HasMaxLength(500);
            entity.Property(e => e.SeoTitle).HasMaxLength(200);
            entity.Property(e => e.ShortDescription).HasMaxLength(500);
            entity.Property(e => e.Sku)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Slug)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.StockStatus)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("in-stock");
            entity.Property(e => e.SubCategory).HasMaxLength(100);
            entity.Property(e => e.Tags)
                .HasMaxLength(1000)
                .HasDefaultValue("[]");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.WorkDetails).HasMaxLength(500);

            entity.HasOne(d => d.Category).WithMany(p => p.Products)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Products_Category");

            entity.HasOne(d => d.Brand).WithMany(p => p.Products)
                .HasForeignKey(d => d.BrandId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Products_Brand");

            entity.HasIndex(e => e.BrandId);

            entity.Property(e => e.DisplayAttributesJson).HasDefaultValue("{}");
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_Products_DisplayAttributes_Json", "ISJSON(DisplayAttributesJson) = 1"));

            entity.HasOne(d => d.AttributeSet).WithMany(s => s.Products)
                .HasForeignKey(d => d.AttributeSetId)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName("FK_Products_AttributeSet");

            entity.HasMany(d => d.Occasions).WithMany(p => p.Products)
                .UsingEntity<Dictionary<string, object>>(
                    "ProductOccasion",
                    r => r.HasOne<Occasion>().WithMany()
                        .HasForeignKey("OccasionId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_ProductOccasions_Occasion"),
                    l => l.HasOne<Product>().WithMany()
                        .HasForeignKey("ProductId")
                        .HasConstraintName("FK_ProductOccasions_Product"),
                    j =>
                    {
                        j.HasKey("ProductId", "OccasionId");
                        j.ToTable("ProductOccasions");
                        j.IndexerProperty<string>("ProductId")
                            .HasMaxLength(50)
                            .IsUnicode(false);
                        j.IndexerProperty<string>("OccasionId")
                            .HasMaxLength(50)
                            .IsUnicode(false);
                    });
        });

        modelBuilder.Entity<ContentPage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).HasMaxLength(60).IsUnicode(false);
            entity.Property(e => e.Name).HasMaxLength(120);
            entity.HasIndex(e => e.Key, "UQ_ContentPages_Key").IsUnique();
        });

        modelBuilder.Entity<SectionType>(entity =>
        {
            entity.HasKey(e => e.Code);
            entity.Property(e => e.Code).HasMaxLength(60).IsUnicode(false);
            entity.Property(e => e.Name).HasMaxLength(120);
            entity.Property(e => e.ItemKind).HasMaxLength(40).IsUnicode(false);
        });

        modelBuilder.Entity<PageSection>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SectionTypeCode).HasMaxLength(60).IsUnicode(false);
            entity.Property(e => e.Eyebrow).HasMaxLength(120);
            entity.Property(e => e.Heading).HasMaxLength(200);
            entity.Property(e => e.Subheading).HasMaxLength(500);
            entity.Property(e => e.CtaLabel).HasMaxLength(80);
            entity.Property(e => e.CtaUrl).HasMaxLength(500);
            entity.Property(e => e.UpdatedBy).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

            // Optimistic concurrency: the admin editor saves the whole page
            // graph in one PUT, so two people reordering at once must conflict
            // rather than silently overwrite each other.
            entity.Property(e => e.RowVersion).IsRowVersion();

            entity.HasIndex(e => new { e.PageId, e.DisplayOrder }, "IX_PageSections_Page_Order");

            entity.HasCheckConstraint("CK_PageSections_Config_Json", "ISJSON(ConfigJson) = 1");

            entity.HasOne(d => d.Page).WithMany(p => p.Sections)
                .HasForeignKey(d => d.PageId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_PageSections_Page");

            entity.HasOne<SectionType>().WithMany()
                .HasForeignKey(d => d.SectionTypeCode)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_PageSections_SectionType");

            entity.HasOne(d => d.ProductRule).WithMany(p => p.Sections)
                .HasForeignKey(d => d.ProductRuleId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_PageSections_ProductRule");
        });

        modelBuilder.Entity<PageSectionItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ItemKind).HasMaxLength(40).IsUnicode(false);
            entity.Property(e => e.ProductId).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.CategoryId).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.OccasionId).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.Subtitle).HasMaxLength(300);
            entity.Property(e => e.Caption).HasMaxLength(500);
            entity.Property(e => e.BadgeText).HasMaxLength(60);
            entity.Property(e => e.LinkUrl).HasMaxLength(500);

            entity.HasIndex(e => new { e.SectionId, e.DisplayOrder }, "IX_PageSectionItems_Section_Order");

            entity.HasOne(d => d.Section).WithMany(p => p.Items)
                .HasForeignKey(d => d.SectionId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_PageSectionItems_Section");

            // Restrict on every content FK. A homepage rail must not be
            // silently emptied by a product delete - the admin has to remove
            // the pin first, which is the whole point of typed rows.
            entity.HasOne(d => d.Product).WithMany()
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_PageSectionItems_Product");

            entity.HasOne(d => d.Category).WithMany()
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_PageSectionItems_Category");

            entity.HasOne(d => d.Occasion).WithMany()
                .HasForeignKey(d => d.OccasionId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_PageSectionItems_Occasion");

            entity.HasOne(d => d.MediaAsset).WithMany()
                .HasForeignKey(d => d.MediaAssetId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_PageSectionItems_MediaAsset");

            entity.HasOne(d => d.MediaAssetMobile).WithMany()
                .HasForeignKey(d => d.MediaAssetMobileId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_PageSectionItems_MediaAssetMobile");
        });

        modelBuilder.Entity<ProductRule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(120);
            entity.HasIndex(e => e.Name, "UQ_ProductRules_Name").IsUnique();
            entity.HasCheckConstraint("CK_ProductRules_Definition_Json", "ISJSON(DefinitionJson) = 1");
        });

        modelBuilder.Entity<PageRevision>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PublishedBy).HasMaxLength(100);
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.PublishedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");

            entity.HasIndex(e => new { e.PageId, e.PublishedAtUtc }, "IX_PageRevisions_Page_PublishedAt");

            entity.HasOne(d => d.Page).WithMany()
                .HasForeignKey(d => d.PageId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_PageRevisions_Page");
        });

        modelBuilder.Entity<SizeChartMeasurement>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Code).HasMaxLength(40).IsUnicode(false);
            entity.Property(e => e.Label).HasMaxLength(60);
            entity.Property(e => e.Value).HasColumnType("decimal(6,2)");
            entity.Property(e => e.Unit).HasMaxLength(10).IsUnicode(false).HasDefaultValue("in");

            // One value per (size, measurement). Without this a re-seed silently
            // doubles every row and the chart renders each size twice.
            entity.HasIndex(e => new { e.OptionId, e.Code }, "UQ_SizeChart_Option_Code").IsUnique();
            entity.HasIndex(e => e.AttributeId, "IX_SizeChart_AttributeId");

            entity.HasOne(d => d.Attribute).WithMany()
                .HasForeignKey(d => d.AttributeId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_SizeChart_Attribute");

            entity.HasOne(d => d.Option).WithMany()
                .HasForeignKey(d => d.OptionId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SizeChart_Option");
        });

        modelBuilder.Entity<MediaAsset>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.StorageKey).HasMaxLength(500).IsUnicode(false);
            entity.Property(e => e.Url).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.SourceUrl).HasMaxLength(1000);
            entity.Property(e => e.ContentType).HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.AltText).HasMaxLength(300);
            entity.Property(e => e.Folder).HasMaxLength(200).IsUnicode(false).HasDefaultValue("uploads");
            entity.Property(e => e.Tags).HasMaxLength(500);
            entity.Property(e => e.DerivativeWidths).HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.ChecksumSha256).HasMaxLength(64).IsUnicode(false).IsFixedLength();
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

            // Url unique is what makes the backfill deduplicating. This
            // catalogue's 166 image references resolve to 74 distinct pictures;
            // without this constraint a re-run would insert them all again.
            entity.HasIndex(e => e.Url, "UQ_MediaAssets_Url").IsUnique();
            entity.HasIndex(e => e.ChecksumSha256, "IX_MediaAssets_Checksum");
            entity.HasIndex(e => new { e.Folder, e.CreatedAt }, "IX_MediaAssets_Folder_CreatedAt");
        });

        modelBuilder.Entity<ProductImage>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.VariantId, "IX_ProductImages_VariantId");

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Alt).HasMaxLength(250);
            entity.Property(e => e.Url).HasMaxLength(500);
            entity.Property(e => e.VariantId)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.Variant).WithMany(p => p.ProductImages)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("FK_ProductImages_Variant");

            entity.HasIndex(e => e.MediaAssetId, "IX_ProductImages_MediaAssetId");

            // Restrict, not Cascade: deleting a library asset must not silently
            // delete the product images referencing it. The admin has to
            // detach or replace them first, which is the behaviour that keeps
            // a shared asset safe to delete.
            entity.HasOne(d => d.MediaAsset).WithMany(p => p.ProductImages)
                .HasForeignKey(d => d.MediaAssetId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_ProductImages_MediaAsset");
        });

        modelBuilder.Entity<ProductSku>(entity =>
        {
            entity.HasKey(e => e.Sku);

            entity.HasIndex(e => e.VariantId, "IX_ProductSkus_VariantId");

            entity.Property(e => e.Sku)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Size)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.VariantId)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.Variant).WithMany(p => p.ProductSkus)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("FK_ProductSkus_Variant");
        });

        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.ProductId, "IX_ProductVariants_ProductId");

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Color).HasMaxLength(80);
            entity.Property(e => e.ColorHex)
                .HasMaxLength(7)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.ProductId)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.Product).WithMany(p => p.ProductVariants)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("FK_ProductVariants_Product");
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.CustomerId, "IX_Reviews_CustomerId");

            entity.HasIndex(e => e.ProductId, "IX_Reviews_ProductId");

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.CustomerCity).HasMaxLength(100);
            entity.Property(e => e.CustomerId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CustomerName).HasMaxLength(150);
            entity.Property(e => e.ProductId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.Customer).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Reviews_Customer");

            entity.HasOne(d => d.Product).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("FK_Reviews_Product");
        });

        modelBuilder.Entity<ReviewImage>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.ReviewId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Url).HasMaxLength(500);

            entity.HasOne(d => d.Review).WithMany(p => p.ReviewImages)
                .HasForeignKey(d => d.ReviewId)
                .HasConstraintName("FK_ReviewImages_Review");
        });

        modelBuilder.Entity<SizeProfile>(entity =>
        {
            entity.HasKey(e => e.CustomerId);

            entity.Property(e => e.CustomerId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.BlouseLength).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Bust).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Height).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Hip).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.LehengaLength).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.PreferredSize)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Shoulder).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.SleeveLength).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Unit)
                .HasMaxLength(3)
                .IsUnicode(false)
                .HasDefaultValue("in");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Waist).HasColumnType("decimal(5, 2)");

            entity.HasOne(d => d.Customer).WithOne(p => p.SizeProfile)
                .HasForeignKey<SizeProfile>(d => d.CustomerId)
                .HasConstraintName("FK_SizeProfiles_Customer");
        });

        modelBuilder.Entity<WishlistItem>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.CustomerId, "IX_WishlistItems_CustomerId");

            entity.HasIndex(e => new { e.CustomerId, e.ProductId }, "UQ_WishlistItems_CustomerProduct").IsUnique();

            entity.Property(e => e.Id)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.AddedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.CustomerId)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ProductId)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.Customer).WithMany(p => p.WishlistItems)
                .HasForeignKey(d => d.CustomerId)
                .HasConstraintName("FK_WishlistItems_Customer");

            entity.HasOne(d => d.Product).WithMany(p => p.WishlistItems)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("FK_WishlistItems_Product");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    /// <summary>
    /// The dynamic attribute system. Kept in its own method rather than inline
    /// above, because this is hand-written configuration — the rest of
    /// OnModelCreating is scaffolded output.
    /// </summary>
    private static void ConfigureAttributeSystem(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AttributeGroup>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<CatalogAttribute>(entity =>
        {
            entity.ToTable("Attributes");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();

            entity.Property(e => e.Code).HasMaxLength(60).IsUnicode(false);
            entity.Property(e => e.Name).HasMaxLength(120);
            entity.Property(e => e.ValueKind).HasMaxLength(12).IsUnicode(false);
            entity.Property(e => e.InputType).HasMaxLength(12).IsUnicode(false);
            entity.Property(e => e.Scope).HasMaxLength(10).IsUnicode(false)
                .HasDefaultValue(AttributeScope.Product);
            entity.Property(e => e.Unit).HasMaxLength(20);
            entity.Property(e => e.ShowOnPdp).HasDefaultValue(true);

            entity.HasOne(e => e.Group).WithMany(g => g.Attributes)
                .HasForeignKey(e => e.GroupId)
                .HasConstraintName("FK_Attributes_Group");

            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Attributes_ValueKind",
                    "ValueKind IN ('Option','Number','Text','Bool')");
                t.HasCheckConstraint("CK_Attributes_Scope",
                    "Scope IN ('product','variant','sku')");

                // The load-bearing constraint: it is structurally impossible to make a
                // free-text attribute facetable. This is what prevents recreating the
                // current Fabric mess (31 prose values, exact-matched, filter broken)
                // in Beauty or Electronics two years from now.
                t.HasCheckConstraint("CK_Attributes_FacetableIsNotText",
                    "IsFacetable = 0 OR ValueKind IN ('Option','Number','Bool')");
            });
        });

        modelBuilder.Entity<AttributeOption>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.AttributeId, e.Slug }).IsUnique();

            entity.Property(e => e.Slug).HasMaxLength(80).IsUnicode(false);
            entity.Property(e => e.Value).HasMaxLength(120);
            entity.Property(e => e.ColorHex).HasMaxLength(7).IsUnicode(false).IsFixedLength();
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.HasOne(e => e.Attribute).WithMany(a => a.Options)
                .HasForeignKey(e => e.AttributeId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_AttributeOptions_Attribute");
        });

        modelBuilder.Entity<AttributeSet>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.Name).HasMaxLength(120);
        });

        modelBuilder.Entity<AttributeSetAttribute>(entity =>
        {
            entity.HasKey(e => new { e.AttributeSetId, e.AttributeId });

            entity.HasOne(e => e.AttributeSet).WithMany(s => s.Attributes)
                .HasForeignKey(e => e.AttributeSetId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_AttributeSetAttributes_Set");

            entity.HasOne(e => e.Attribute).WithMany()
                .HasForeignKey(e => e.AttributeId)
                .HasConstraintName("FK_AttributeSetAttributes_Attribute");
        });

        modelBuilder.Entity<ProductAttributeOption>(entity =>
        {
            entity.HasKey(e => new { e.ProductId, e.AttributeId, e.OptionId });

            // THE facet index. Every PLP filter goes through this as an
            // index seek on (OptionId, ProductId) — covering, so no key lookup.
            entity.HasIndex(e => new { e.OptionId, e.ProductId })
                .HasDatabaseName("IX_PAO_Option_Product");
            entity.HasIndex(e => new { e.AttributeId, e.OptionId, e.ProductId })
                .HasDatabaseName("IX_PAO_Attr_Option_Product");

            entity.HasOne(e => e.Product).WithMany(p => p.AttributeOptions)
                .HasForeignKey(e => e.ProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_ProductAttributeOptions_Product");

            entity.HasOne(e => e.Attribute).WithMany()
                .HasForeignKey(e => e.AttributeId)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName("FK_ProductAttributeOptions_Attribute");

            entity.HasOne(e => e.Option).WithMany()
                .HasForeignKey(e => e.OptionId)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName("FK_ProductAttributeOptions_Option");
        });

        modelBuilder.Entity<ProductAttributeNumber>(entity =>
        {
            entity.HasKey(e => new { e.ProductId, e.AttributeId });
            entity.Property(e => e.NumericValue).HasColumnType("decimal(18, 4)");

            entity.HasIndex(e => new { e.AttributeId, e.NumericValue })
                .HasDatabaseName("IX_PAN_Attr_Value");

            entity.HasOne(e => e.Product).WithMany(p => p.AttributeNumbers)
                .HasForeignKey(e => e.ProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_ProductAttributeNumbers_Product");

            entity.HasOne(e => e.Attribute).WithMany()
                .HasForeignKey(e => e.AttributeId)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName("FK_ProductAttributeNumbers_Attribute");
        });
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
