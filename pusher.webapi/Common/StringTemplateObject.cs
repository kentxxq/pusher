namespace pusher.webapi.Common;

public class StringTemplateObject
{
    public List<TemplateParseObject> Variables { get; set; }
    public string TemplateText { get; set; }
}

public class TemplateParseObject
{
    public string VariableName { get; set; }
    public string JsonPath { get; set; }
}
