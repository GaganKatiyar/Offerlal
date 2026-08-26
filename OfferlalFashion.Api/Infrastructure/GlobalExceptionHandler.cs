using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace OfferlalFashion.Api.Infrastructure;

/// <summary>
/// Converts unhandled exceptions into RFC 7807 ProblemDetails responses.
///
/// Without this, an unhandled exception in Production returns an empty
/// connection-reset and in Development leaks a full stack trace to the caller.
/// Every failure now returns a consistent, machine-readable body and is logged
/// with a traceId the caller can quote in a support request.
/// </summary>
public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<GlobalExceptionHandler> logger,
    IHostEnvironment env) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var traceId = httpContext.TraceIdentifier;

        logger.LogError(
            exception,
            "Unhandled exception on {Method} {Path} (traceId {TraceId})",
            httpContext.Request.Method,
            httpContext.Request.Path,
            traceId);

        var (status, title) = exception switch
        {
            // A request the client cancelled is not a server fault; don't dress it as 500.
            OperationCanceledException => (StatusCodes.Status499ClientClosedRequest, "Request cancelled"),
            BadHttpRequestException    => (StatusCodes.Status400BadRequest, "Malformed request"),
            _                          => (StatusCodes.Status500InternalServerError, "An unexpected error occurred"),
        };

        httpContext.Response.StatusCode = status;

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Instance = $"{httpContext.Request.Method} {httpContext.Request.Path}",
        };

        problem.Extensions["traceId"] = traceId;

        // Exception detail is diagnostic only — never expose it outside Development.
        if (env.IsDevelopment())
        {
            problem.Detail = exception.ToString();
        }

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception,
        });
    }
}
