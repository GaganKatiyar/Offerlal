namespace OfferlalFashion.Api.Email;

/// <summary>
/// SMTP configuration, bound from the "Email" section.
///
/// Deliberately absent from appsettings.json and appsettings.Development.json —
/// both are committed to git, and an app password belongs in the gitignored
/// appsettings.*.Local.json overlay (see appsettings.Development.Local.json.example),
/// or in environment variables / user-secrets. When Username is empty, email is
/// logged rather than sent — see LoggingEmailSender.
/// </summary>
public sealed class EmailOptions
{
    public string SmtpHost { get; set; } = "smtp.gmail.com";

    public int SmtpPort { get; set; } = 587;

    /// <summary>The Gmail address to send from, e.g. "noreply.offerlal@gmail.com".</summary>
    public string Username { get; set; } = "";

    /// <summary>
    /// A 16-character Google App Password, NOT the account's normal password.
    /// Generated at myaccount.google.com/apppasswords, which requires
    /// 2-Step Verification to be turned on for that Google account first.
    /// </summary>
    public string AppPassword { get; set; } = "";

    public string FromAddress { get; set; } = "";

    public string FromName { get; set; } = "Offerlal Fashion";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Username) && !string.IsNullOrWhiteSpace(AppPassword);
}
