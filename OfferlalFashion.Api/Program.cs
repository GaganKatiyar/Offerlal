using System.Text.RegularExpressions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using OfferlalFashion.Api.Auth;
using OfferlalFashion.Api.Catalog;
using OfferlalFashion.Api.Commerce;
using OfferlalFashion.Api.Content;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Email;
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

    // ── Local secrets ────────────────────────────────────────────────────────
    // appsettings.Development.Local.json is gitignored and holds real SMTP and
    // gateway credentials. It is NOT one of the filenames the host loads by
    // default, so without this line the file is silently ignored — which is
    // exactly what happened: the .example file and the startup warning below
    // both named it while nothing read it, so filling it in changed nothing.
    //
    // Added last so it overrides the committed appsettings files.
    builder.Configuration.AddJsonFile(
        "appsettings.Development.Local.json", optional: true, reloadOnChange: true);

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

    // ── Authentication ───────────────────────────────────────────────────────
    var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();

    if (string.IsNullOrWhiteSpace(jwt.SigningKey))
    {
        if (builder.Environment.IsDevelopment())
        {
            // Development-only: a per-process random key. Restarting the API
            // invalidates existing tokens, which is mildly annoying and far
            // better than shipping a known default that anyone could use to
            // mint valid admin tokens.
            jwt.SigningKey = Convert.ToBase64String(
                System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));
            Log.Warning("No Jwt:SigningKey configured. Generated a temporary development key; tokens will not survive a restart.");
        }
        else
        {
            throw new InvalidOperationException(
                "Jwt:SigningKey is not configured. Refusing to start with an unsigned or default-signed token scheme.");
        }
    }

    builder.Services.AddSingleton(jwt);
    builder.Services.AddScoped<TokenService>();

    // ── Email ────────────────────────────────────────────────────────────────
    var emailOptions = builder.Configuration.GetSection("Email").Get<EmailOptions>() ?? new EmailOptions();
    builder.Services.AddSingleton(Microsoft.Extensions.Options.Options.Create(emailOptions));

    if (emailOptions.IsConfigured)
    {
        builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
    }
    else
    {
        // Same shape as the JWT signing-key fallback above: development
        // continues to work with no external dependency, and the gap is
        // impossible to miss because it is logged on every send, not just once
        // at startup.
        builder.Services.AddSingleton<IEmailSender, LoggingEmailSender>();
        Log.Warning(
            "No Email:Username/Email:AppPassword configured. Verification and " +
            "password-reset emails will be LOGGED, not sent. See appsettings.Development.Local.json.example.");
    }

    builder.Services.AddScoped<VerificationService>();
    builder.Services.AddScoped<AdminBootstrapper>();
    builder.Services.AddScoped<IPasswordHasher<OfferlalFashion.Api.Models.AdminUser>,
        PasswordHasher<OfferlalFashion.Api.Models.AdminUser>>();
    builder.Services.AddScoped<IPasswordHasher<OfferlalFashion.Api.Models.Customer>,
        PasswordHasher<OfferlalFashion.Api.Models.Customer>>();

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(o =>
        {
            // Without this, the bearer handler rewrites standard JWT claim
            // names to long WS-* URIs, so reading "sub" returns null and every
            // subject lookup silently misses. Clearing the legacy
            // JwtSecurityTokenHandler map does NOT help here: .NET 8+ uses
            // JsonWebTokenHandler, which honours this flag instead.
            o.MapInboundClaims = false;

            o.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwt.Issuer,
                ValidAudience = jwt.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                // Default is 5 minutes, which quietly extends every token's
                // life past its stated expiry.
                ClockSkew = TimeSpan.FromSeconds(30),
            };
        });

    builder.Services.AddAuthorization();

    // ── Catalog ──────────────────────────────────────────────────────────────
    builder.Services.AddScoped<AttributeProjectionService>();
    builder.Services.AddScoped<ProductQueryService>();
    builder.Services.AddScoped<SizeChartSeeder>();

    // ── Commerce ─────────────────────────────────────────────────────────────
    builder.Services.AddScoped<PricingService>();
    builder.Services.AddScoped<OrderService>();

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
                // The Angular storefront's dev server.
                origin is "http://localhost:4200" or "http://localhost:4300"
                // Ionic's dev server, in a browser.
                or "http://localhost:8100"
                // The Capacitor WebView on a device. Android with the default
                // http scheme reports a bare "http://localhost" with no port;
                // iOS and the capacitor:// scheme report this instead. Neither
                // is a port on this machine, so neither matched the rules above
                // and every request from the installed app failed CORS.
                // Capacitor 4+ defaults androidScheme to https, so the WebView
                // reports https://localhost even though nothing is served over
                // TLS. http://localhost covers androidScheme: 'http'.
                or "capacitor://localhost" or "https://localhost" or "http://localhost"
                // A phone on the LAN hitting either dev server directly.
                || Regex.IsMatch(origin, @"^http://192\.168\.\d{1,3}\.\d{1,3}:(4300|8100)$"))
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
    app.UseAuthentication();
    app.UseAuthorization();

    // Roles and the first-run admin account, before the app serves traffic.
    using (var scope = app.Services.CreateScope())
    {
        await scope.ServiceProvider.GetRequiredService<AdminBootstrapper>().RunAsync();
    }

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
