using System.Net.Mime;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc.Filters;

namespace pusher.webapi.Common;

public class PusherExceptionFilter : IOrderedFilter, IAsyncExceptionFilter
{
    private readonly ILogger<PusherExceptionFilter> _logger;

    public PusherExceptionFilter(ILogger<PusherExceptionFilter> logger)
    {
        _logger = logger;
    }

    public async Task OnExceptionAsync(ExceptionContext context)
    {
        if (context.Exception is PusherException pusherException)
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status200OK;
            context.HttpContext.Response.ContentType = MediaTypeNames.Application.Json;
            var exceptionHandlerPathFeature =
                context.HttpContext.Features.Get<IExceptionHandlerPathFeature>();
            var result = ResultModel.Error(pusherException.Message,
                exceptionHandlerPathFeature?.Error.Source ?? string.Empty);

            context.ExceptionHandled = true;
            _logger.LogWarning(pusherException.Message);
            await context.HttpContext.Response.WriteAsJsonAsync(result);
        }
    }

    public int Order => int.MaxValue - 10;
}
