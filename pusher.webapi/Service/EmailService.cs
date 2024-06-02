using System.Security.Authentication;
using MailKit.Net.Proxy;
using MailKit.Net.Smtp;
using MimeKit;
using MimeKit.Text;

namespace pusher.webapi.Service;

public class EmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly IConfiguration _configuration;
    private readonly string account;
    private readonly string password;
    private readonly int port;
    private readonly bool security;
    private readonly string senderEmail;
    private readonly string senderName;
    private readonly string server;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;

        server = _configuration["Email:Server"];
        port = _configuration.GetValue<int>("Email:Port");
        senderName = _configuration["Email:SenderName"];
        senderEmail = _configuration["Email:SenderEmail"];
        account = _configuration["Email:Account"];
        password = _configuration["Email:Password"];
        security = _configuration.GetValue<bool>("Email:Security");
    }

    /// <summary>
    ///     smtp发送信息
    /// </summary>
    /// <param name="mimeMessage"></param>
    /// <param name="proxyClient"></param>
    private async Task<bool> SendMessage(MimeMessage mimeMessage,ProxyClient? proxyClient=null)
    {
        using var client = new SmtpClient();
        if (proxyClient != null) client.ProxyClient = proxyClient;
        client.SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13;

        try
        {
            await client.ConnectAsync(server, port, security);
            // Note: only needed if the SMTP server requires authentication
            await client.AuthenticateAsync(account, password);
            await client.SendAsync(mimeMessage);
            await client.DisconnectAsync(true);
            return true;
        }
        catch (Exception e)
        {
            _logger.LogWarning("邮件发送失败{EMessage}", e.Message);
            return false;
        }
    }

    /// <summary>
    ///     发送文本
    /// </summary>
    /// <param name="to"></param>
    /// <param name="subject"></param>
    /// <param name="text"></param>
    public async Task<bool> SendAsync(string to, string subject, string text,ProxyClient? proxyClient=null)
    {
        return await SendAsync(new List<string> { to }, subject, text,proxyClient);
    }

    /// <summary>
    ///     向多人发送文本
    /// </summary>
    /// <param name="to"></param>
    /// <param name="subject"></param>
    /// <param name="text"></param>
    public async Task<bool> SendAsync(IEnumerable<string> to, string subject, string text,ProxyClient? proxyClient=null)
    {
        return await SendAsync(to, Enumerable.Empty<string>(), subject, text,proxyClient);
    }

    /// <summary>
    ///     向多人发送文本+抄送
    /// </summary>
    /// <param name="to"></param>
    /// <param name="cc"></param>
    /// <param name="subject"></param>
    /// <param name="text"></param>
    public async Task<bool> SendAsync(IEnumerable<string> to, IEnumerable<string> cc, string subject, string text,ProxyClient? proxyClient=null)
    {
        return await SendAsync(to, cc, subject, new TextPart(TextFormat.Text) { Text = text },
            Enumerable.Empty<(string FileName, Stream Content)>(),proxyClient);
    }

    /// <summary>
    ///     发送文本+单个本地文件
    /// </summary>
    /// <param name="to"></param>
    /// <param name="subject"></param>
    /// <param name="text"></param>
    /// <param name="filePath"></param>
    public async Task<bool> SendAsync(string to, string subject, string text, string filePath,ProxyClient? proxyClient=null)
    {
        return await SendAsync(new List<string> { to }, subject, new TextPart(TextFormat.Text) { Text = text }, filePath,proxyClient);
    }


    /// <summary>
    ///     向多人发送+单个本地文件
    /// </summary>
    /// <param name="to"></param>
    /// <param name="subject"></param>
    /// <param name="body"></param>
    /// <param name="filePath"></param>
    public async Task<bool> SendAsync(IEnumerable<string> to, string subject, TextPart body,
        string filePath,ProxyClient? proxyClient=null)
    {
        return await SendAsync(to, Enumerable.Empty<string>(), subject, body, filePath,proxyClient);
    }

    /// <summary>
    ///     向多人发送+抄送+单个本地文件
    /// </summary>
    /// <param name="to"></param>
    /// <param name="cc"></param>
    /// <param name="subject"></param>
    /// <param name="body"></param>
    /// <param name="filePath"></param>
    public async Task<bool> SendAsync(IEnumerable<string> to, IEnumerable<string> cc, string subject, TextPart body,
        string filePath,ProxyClient? proxyClient=null)
    {
        return await SendAsync(to, cc, subject, body, new List<string> { filePath },proxyClient);
    }

    /// <summary>
    ///     发送-本地文件-全
    /// </summary>
    /// <param name="to"></param>
    /// <param name="cc"></param>
    /// <param name="subject"></param>
    /// <param name="body"></param>
    /// <param name="filesPath"></param>
    public async Task<bool> SendAsync(IEnumerable<string> to, IEnumerable<string> cc, string subject, TextPart body,
        IEnumerable<string> filesPath,ProxyClient? proxyClient=null)
    {
        var tuples = filesPath.Select(filePath => (filePath: Path.GetFileName(filePath),
            fileStream: new FileStream(filePath, FileMode.Open) as Stream)).ToList();
        var result = await SendAsync(to, cc, subject, body, tuples,proxyClient);
        foreach (var tuple in tuples)
        {
            await tuple.fileStream.DisposeAsync();
        }

        return result;
    }

    /// <summary>
    ///     发送-文件流-全
    /// </summary>
    /// <param name="to"></param>
    /// <param name="cc"></param>
    /// <param name="subject"></param>
    /// <param name="body"></param>
    /// <param name="fileStreamTuples"></param>
    public async Task<bool> SendAsync(IEnumerable<string> to, IEnumerable<string> cc, string subject, TextPart body,
        IEnumerable<(string FileName, Stream ContentStream)> fileStreamTuples,ProxyClient? proxyClient=null)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.AddRange(to.Select(t => new MailboxAddress(t, t)));
        message.Cc.AddRange(cc?.Select(c => new MailboxAddress(c, c)));
        message.Subject = subject;

        var multipart = new Multipart("mixed");
        multipart.Add(body);

        foreach (var fileStreamTuple in fileStreamTuples)
        {
            var attachment = new MimePart
            {
                FileName = fileStreamTuple.FileName,
                Content = new MimeContent(fileStreamTuple.ContentStream),
                ContentDisposition = new ContentDisposition(ContentDisposition.Attachment),
                ContentTransferEncoding = ContentEncoding.Base64
            };
            // var charset = "GB18030";
            // const string charset = "utf-8";
            // attachment.ContentType.Parameters.Add(charset, "name", fileStreamTuple.FileName);
            // attachment.ContentDisposition.Parameters.Add(charset, "filename", fileStreamTuple.FileName);
            multipart.Add(attachment);
        }

        message.Body = multipart;
        return await SendMessage(message,proxyClient);
    }
}
