using pusher.webapi.Common;
using SqlSugar;

namespace pusher.webapi.Models.DB;

[SugarTable(nameof(StringTemplate), "字符串模板")]
public class StringTemplate
{
    [SugarColumn(IsIdentity = true, IsPrimaryKey = true)]
    public int Id { get; set; }

    [SugarColumn(ColumnDescription = "字符串模板名称")]
    public string TemplateName { get; set; }

    [SugarColumn(ColumnDescription = "字符串模板code,类似roomcode采用uuid形式")]
    public string TemplateCode { get; set; }

    [SugarColumn(IsJson = true, ColumnDescription = "字符串模板数据")]
    public StringTemplateObject StringTemplateObject { get; set; }

    [SugarColumn(ColumnDescription = "所属用户id")]
    public int UserId { get; set; } = 1;
}
