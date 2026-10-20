using System.ComponentModel.DataAnnotations;

namespace pusher.webapi.Enums;

public enum HttpClientType
{
    [Display(Name = "默认", Description = "采用自带的AddStandardResilienceHandler")]
    Default
}
