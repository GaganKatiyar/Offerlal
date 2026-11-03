namespace OfferlalFashion.Api.Email;

public interface IEmailSender
{
    Task SendAsync(string toAddress, string subject, string plainTextBody, CancellationToken ct = default);
}
