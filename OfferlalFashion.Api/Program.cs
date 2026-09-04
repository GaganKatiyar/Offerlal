using System.Text.RegularExpressions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Catalog;
using OfferlalFashion.Api.Content;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Infrastructure;
using OfferlalFashion.Api.Media;
using Serilog;

// Bootstrap logger — captures failures that happen before the host is built
// (bad config, missing connection string) which would otherwise be silent.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Logging ──────────────────────────────────────────────────────────────
    builder.Host.UseSerilog((context, services, config) => config
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File(
            path: "logs/offerlal-.log",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 14,
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"));

    // ── Data ─────────────────────────────────────────────────────────────────
    var connectionString = builder.Configuration.GetConnectionString("OfferlalFashion")
        ?? throw new InvalidOperationException(
            "Connection string 'OfferlalFashion' is not configured.");

    builder.Services.AddDbContext<OfferlalFashionDbContext>(options =>
        options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure()));

    // ── Error handling ───────────────────────────────────────────────────────
    builder.Services.AddProblemDetails();
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

    // ── Validation ───────────────────────────────────────────────────────────
    // Validators are discovered from this assembly; used once write endpoints exist.
    builder.Services.AddValidatorsFromAssemblyContaining<Program>();

    // ── Health ───────────────────────────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<OfferlalFashionDbContext>(
            name: "database",
            tags: ["ready"]);

    // ── Catalog ──────────────────────────────────────────────────────────────
    builder.Services.AddScoped<AttributeProjectionService>();
    builder.Services.AddScoped<ProductQueryService>();
    builder.Services.AddScoped<SizeChartSeeder>();

    // ── Content ──────────────────────────────────────────────────────────────
    builder.Services.AddScoped<ContentService>();
    builder.Services.AddScoped<HomepageSeeder>();
    builder.Services.AddScoped<NavigationSeeder>();

    // ── Media ────────────────────────────────────────────────────────────────
    builder.Services.AddSingleton(new LocalDiskMediaStorageOptions());
    builder.Services.AddSingleton<IMediaStorage, LocalDiskMediaStorage>();
    builder.Services.AddScoped<MediaService>();
    builder.Services.AddScoped<MediaBackfillService>();

    builder.Services.AddControllers();
    builder.Services.AddOpenApi();

    // ── CORS ─────────────────────────────────────────────────────────────────
    // Dev only: allows localhost and any private-LAN origin on the Angular port,
    // so the storefront can be tested from a phone on the same Wi-Fi.
    const string CorsPolicy = "StorefrontDev";
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(CorsPolicy, policy => policy
            .SetIsOriginAllowed(origin =>
                origin is "http://localhost:4200" or "http://localhost:4300"
                || Regex.IsMatch(origin, @"^http://192\.168\.\d{1,3}\.\d{1,3}:4300$"))
            .AllowAnyHeader()
            .AllowAnyMethod());
    });

    var app = builder.Build();

    // ── Pipeline ─────────────────────────────────────────────────────────────
    app.UseExceptionHandler();
    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }
    else
    {
        // HSTS and HTTPS redirection belong to non-dev only; in dev the API is
        // served over plain HTTP for the Angular proxy and LAN device testing.
        app.UseHsts();
        app.UseHttpsRedirection();
    }

    // Serves wwwroot, which is where LocalDiskMediaStorage writes. Media is
    // content-addressed (the storage key contains a hash of the bytes), so a
    // given URL can never point at different bytes later and is safe to cache
    // for a year.
    app.UseStaticFiles(new StaticFileOptions
    {
        OnPrepareResponse = ctx =>
        {
            if (ctx.Context.Request.Path.StartsWithSegments("/media"))
            {
                ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            }
        },
    });

    app.UseCors(CorsPolicy);
    app.UseAuthorization();

    app.MapControllers();

    // Liveness: is the process up. Readiness: can it reach its dependencies.
    app.MapHealthChecks("/health/live", new()
    {
        Predicate = _ => false,
    });
    app.MapHealthChecks("/health/ready", new()
    {
        Predicate = check => check.Tags.Contains("ready"),
    });

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

// Exposed so AddValidatorsFromAssemblyContaining<Program>() and integration
// tests (WebApplicationFactory<Program>) can reference the entry-point assembly.
public partial class Program;
