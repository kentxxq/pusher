using pusher.webapi.Common;

namespace pusher.webapi.Models.RO;

public class UpdateStringTemplateRO
{
    public int Id { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public StringTemplateObject StringTemplateObject { get; set; } = null!;
}
