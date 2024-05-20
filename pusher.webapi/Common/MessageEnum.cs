using System.ComponentModel.DataAnnotations;

namespace pusher.webapi.Common;

public enum MessageEnum
{
    [Display(Name = "文本", Description = "纯文本")]
    Text,

    [Display(Name = "图片", Description = "图片文件")]
    Image,

    [Display(Name = "json模板", Description = "解析json拿到变量值,渲染到字符串模板内")]
    JsonTemplate
}
