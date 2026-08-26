using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddDbContext<OfferlalFashionDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("OfferlalFashion")));
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularDev", policy =>
        policy.SetIsOriginAllowed(origin =>
                  origin is "http://localhost:4200" or "http://localhost:4300"
                  || System.Text.RegularExpressions.Regex.IsMatch(origin, @"^http://192\.168\.\d{1,3}\.\d{1,3}:4300$"))
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("AngularDev");

app.UseAuthorization();

app.MapControllers();

app.Run();
