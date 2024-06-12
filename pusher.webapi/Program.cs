using System.Net.Mime;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Diagnostics;
using pusher.webapi.Common;
using pusher.webapi.Extensions;
using pusher.webapi.Jobs;
using pusher.webapi.Service;
using pusher.webapi.Service.Database;
using pusher.webapi.Service.MessageHandler;
using Serilog;
using Serilog.Events;
using Serilog.Sinks.SystemConsole.Themes;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Is(LogEventLevel.Information)
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("System", LogEventLevel.Warning)
    .Enrich.WithProperty("AppName", ThisAssembly.Project.AssemblyName)
    .Enrich.When(logEvent => !logEvent.Properties.ContainsKey("SourceContext"),
        enrichmentConfig => enrichmentConfig.WithProperty("SourceContext", "SourceContext"))
    .Enrich.When(logEvent => !logEvent.Properties.ContainsKey("ThreadName"),
        enrichmentConfig => enrichmentConfig.WithProperty("ThreadName", "ThreadName"))
    .Enrich.FromLogContext()
    .Enrich.WithThreadId()
    .Enrich.WithThreadName()
    .WriteTo.Async(l => l.File(
        path: builder.Configuration["KLog:File:Path"] ?? $"{ThisAssembly.Project.AssemblyName}-.log",
        formatter: MyJsonFormatter.Formatter,
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: builder.Configuration.GetValue("KLog:File:RetainedFileCountLimit", 1)))
    .WriteTo.Async(l =>
        l.Console(
            outputTemplate: builder.Configuration["KLog:Console:OutputTemplate"] ??
                            "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}|{Level:u3}|{SourceContext}|{ThreadName}|{ThreadId}|{Message:lj}{Exception}{NewLine}",
            theme: AnsiConsoleTheme.Code))
    .CreateBootstrapLogger();

Log.Information("启动中...");

try
{
    builder.Services.AddSerilog();

    builder.Services.AddControllers(options => { options.Filters.Add<PusherExceptionFilter>(); })
        .AddJsonOptions(options =>
        {
            // 返回的json如果有null字段,就不传输
            options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        })
        .ConfigureApiBehaviorOptions(options =>
        {
            options.InvalidModelStateResponseFactory = ValidationProblemDetails.MakeValidationResponse;
        });
    builder.Services.AddSingleton<JWTService>();
    builder.Services.AddMySwagger();
    builder.AddMyJWT();
    builder.Services.AddTransient<EmailService>();
    builder.AddMyQuartz();

    builder.Services.AddHttpClient("default")
        .AddStandardResilienceHandler();

    // 数据库
    builder.Services.AddSqlsugarSetup(builder.Configuration);
    builder.Services.AddTransient<DBService>();
    builder.Services.AddScoped(typeof(Repository<>));


    // 业务service
    builder.Services.AddTransient<DashboardService>();
    builder.Services.AddScoped<UserService>();
    builder.Services.AddScoped<RoomService>();
    builder.Services.AddScoped<ChannelService>();
    builder.Services.AddScoped<StringTemplateService>();
    builder.Services.AddChannelHandlers();
    // builder.Services.AddScoped<IChannelHandler, LarkChannelHandlerHttp>();
    // builder.Services.AddScoped<IChannelHandler, DinkTalkChannelHandlerHttp>();
    // builder.Services.AddScoped<IChannelHandler, ComWechatChannelHandlerHttp>();
    // builder.Services.AddScoped<IChannelHandler, TelegramChannelHandlerHttp>();
    // builder.Services.AddScoped<IChannelHandler, BarkChannelHandlerHttp>();
    // builder.Services.AddScoped<IChannelHandler, EmailChannelHandler>();
    // builder.Services.AddScoped<IChannelHandler, WebhookChannelHandler>();
    builder.Services.AddScoped<IMessageHandler, TextHandler>();


    var app = builder.Build();

    // 拦截pusherException之外的异常, pusherException用filter处理
    app.UseExceptionHandler(exceptionHandlerApp =>
    {
        exceptionHandlerApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status200OK;
            context.Response.ContentType = MediaTypeNames.Application.Json;
            var exceptionHandlerPathFeature =
                context.Features.Get<IExceptionHandlerPathFeature>();
            ResultModel<string> result;
            if (app.Environment.IsDevelopment())
            {
                // 包含代码结构，属于敏感信息
                result = ResultModel.Error(exceptionHandlerPathFeature?.Error.Message ?? string.Empty,
                    exceptionHandlerPathFeature?.Error.StackTrace ?? string.Empty);
            }
            else
            {
                result = ResultModel.Error(exceptionHandlerPathFeature?.Error.Message ?? string.Empty,
                    exceptionHandlerPathFeature?.Error.Source ?? string.Empty);
            }

            await context.Response.WriteAsJsonAsync(result);
        });
    });

    // 处理403,401等状态码
    app.UseStatusCodePages(async statusCodeContext =>
    {
        statusCodeContext.HttpContext.Response.ContentType = MediaTypeNames.Application.Json;
        var result = ResultModel.Error(statusCodeContext.HttpContext.Response.StatusCode.ToString(),
            statusCodeContext.HttpContext.Response.StatusCode);
        await statusCodeContext.HttpContext.Response.WriteAsJsonAsync(result);
    });

    // 简化http输出
    app.UseSerilogRequestLogging();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger(options => { options.SerializeAsV2 = true; }); // 不这么配置,无法读取/swagger/v1/swagger.json
        app.UseSwaggerUI(u =>
        {
            // 拦截 /swagger/v1/swagger.json 到 SwaggerDoc的v1
            u.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
            // 右上角会有2个选项
            u.SwaggerEndpoint("/swagger/v2/swagger.json", "v2");
        });
    }

    // 加上一个前缀
    app.UsePathBase(new PathString($"/{ThisAssembly.Project.AssemblyName}"));

    // 认证
    app.UseAuthentication();
    // 授权
    app.UseAuthorization();

    // 全局添加需要验证
    app.MapControllers().RequireAuthorization();
    // app.MapControllers();

    app.Run();
}

catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
