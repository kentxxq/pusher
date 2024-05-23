using pusher.webapi.Common;

namespace pusher.webapi.RO;

public class CreateStringTemplateRO
{
    public string TemplateName { get; set; } = string.Empty;
    public StringTemplateObject StringTemplateObject { get; set; } = null!;
}
