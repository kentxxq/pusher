using System.ComponentModel.DataAnnotations;

namespace pusher.webapi.Common;

public enum ChannelEnum
{
    [Display(Name = "钉钉")] DingTalk,
    [Display(Name = "企业微信")] ComWechat,
    [Display(Name = "飞书")] Lark
}
