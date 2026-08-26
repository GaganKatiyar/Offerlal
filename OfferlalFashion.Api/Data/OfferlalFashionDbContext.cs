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
        });

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

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
