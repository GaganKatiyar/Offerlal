using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace OfferlalFashion.Api.Email;

/// <summary>
/// Sends over Gmail's SMTP relay using an App Password.
///
/// Gmail's free-tier sending limit is roughly 500 messages/day per account —
/// fine for verification codes and password resets at this scale, wrong for
/// marketing volume. That is a future migration (SendGrid/SES), not a reason to
/// avoid shipping the feature now with zero infrastructure cost.
/// </summary>
public sealed class SmtpEmailSender(IOptions<EmailOptions> options) : IEmailSender
{
    public async Task SendAsync(string toAddress, string subject, string plainTextBody, CancellationToken ct = default)
    {
        var opts = options.Value;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(opts.FromName, string.IsNullOrWhiteSpace(opts.FromAddress) ? opts.Username : opts.FromAddress));
        message.To.Add(MailboxAddress.Parse(toAddress));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = plainTextBody };

        using var client = new SmtpClient();
        await client.ConnectAsync(opts.SmtpHost, opts.SmtpPort, SecureSocketOptions.StartTls, ct);
        await client.AuthenticateAsync(opts.Username, opts.AppPassword, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
