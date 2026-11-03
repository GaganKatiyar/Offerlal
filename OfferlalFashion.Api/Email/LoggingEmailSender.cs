using Microsoft.Extensions.Logging;

namespace OfferlalFashion.Api.Email;

/// <summary>
/// Stands in for SmtpEmailSender when no Gmail credentials are configured.
///
/// Writes the verification code or reset link to the API's own log at Warning
/// level, so nothing throws and the whole registration/reset flow can be
/// developed and tested end-to-end before real credentials exist — the same
/// shape as TokenService generating a temporary JWT signing key and warning
/// about it, rather than refusing to start.
///
/// This must never be selected in production: an unconfigured mailer there
/// means password resets silently go nowhere.
/// </summary>
public sealed class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(string toAddress, string subject, string plainTextBody, CancellationToken ct = default)
    {
        logger.LogWarning(
            "EMAIL NOT SENT (no SMTP configured) — To: {To} | Subject: {Subject}\n{Body}",
            toAddress, subject, plainTextBody);
        return Task.CompletedTask;
    }
}
