using System.Net.Mime;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Diagnostics;
using pusher.webapi.Common;
using pusher.webapi.Extensions;
using pusher.webapi.Jobs;
using pusher.webapi.Options;
using pusher.webapi.Service;
using pusher.webapi.Service.MessageHandler;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .AddDefaultLogConfig()
    .CreateBootstrapLogger();

Log.Information("日志初始化完成,正在启动服务...");

try
{
    // 配置信息
    builder.Services.Configure<DataOptions>(builder.Configuration.GetSection(nameof(DataOptions)));

    // 注册服务
    builder.Host.UseSerilog((serviceProvider, loggerConfiguration) =>
    {
        loggerConfiguration.AddCustomLogConfig(builder.Configuration);
    });

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
    builder.Services.AddOpenApi(options => { options.AddDocumentTransformer<BearerSecuritySchemeTransformer>(); });
    builder.AddMyJWT();
    builder.Services.AddTransient<EmailService>();
    builder.AddMyQuartz();

    builder.Services.AddHttpClient("default")
        .AddStandardResilienceHandler();

    // 数据库
    builder.AddSqlsugarSetup();

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

    // 处理403,401这些400-599之间的状态码
    app.UseStatusCodePages(async statusCodeContext =>
    {
        app.Logger.LogInformation("状态码:{StatusCode}", statusCodeContext.HttpContext.Response.StatusCode);
        var result = ResultModel.Error(statusCodeContext.HttpContext.Response.StatusCode.ToString(),
            statusCodeContext.HttpContext.Response.StatusCode);
        statusCodeContext.HttpContext.Response.ContentType = MediaTypeNames.Application.Json;
        statusCodeContext.HttpContext.Response.StatusCode = StatusCodes.Status200OK;
        await statusCodeContext.HttpContext.Response.WriteAsJsonAsync(result);
    });

    // 简化http输出
    app.UseSerilogRequestLogging();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.MapScalarApiReference(options =>
        {
            options.Servers = [];

            // 必须配置2个才能让WithHttpBearerAuthentication生效 https://github.com/scalar/scalar/issues/3927
            // Basic
            options
                .WithPreferredScheme("Basic") // Security scheme name from the OpenAPI document
                .WithHttpBasicAuthentication(basic =>
                {
                    basic.Username = "your-username";
                    basic.Password = "your-password";
                });

            options.WithPreferredScheme("Bearer")
                .WithHttpBearerAuthentication(bearer => { bearer.Token = "your-bearer-token"; });
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
