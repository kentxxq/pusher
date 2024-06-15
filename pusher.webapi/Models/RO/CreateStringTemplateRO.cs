using pusher.webapi.Common;

namespace pusher.webapi.Models.RO;

public class CreateStringTemplateRO
{
    public string TemplateName { get; set; } = string.Empty;

    public string TemplateCode { get; set; }
    public StringTemplateObject StringTemplateObject { get; set; } = null!;
}
