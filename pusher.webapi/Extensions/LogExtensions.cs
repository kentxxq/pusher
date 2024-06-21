using pusher.webapi.Common;
using Serilog;
using Serilog.Events;
using Serilog.Sinks.SystemConsole.Themes;

namespace pusher.webapi.Extensions;

public static class LogExtensions
{
    private static LoggerConfiguration AddCommonConfig(this LoggerConfiguration loggerConfiguration)
    {
        return loggerConfiguration
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
            .Enrich.WithThreadName();
    }

    public static LoggerConfiguration AddDefaultLogConfig(this LoggerConfiguration loggerConfiguration)
    {
        return loggerConfiguration
            .AddCommonConfig()
            .WriteTo.Async(l => l.File(
                path: $"{ThisAssembly.Project.AssemblyName}-.log",
                formatter: MyJsonFormatter.Formatter,
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 1))
            .WriteTo.Async(l =>
                l.Console(
                    outputTemplate:
                    "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}|{Level:u3}|{SourceContext}|{ThreadName}|{ThreadId}|{Message:lj}{Exception}{NewLine}",
                    theme: AnsiConsoleTheme.Code));
    }

    public static LoggerConfiguration AddCustomLogConfig(this LoggerConfiguration loggerConfiguration,
        IConfiguration configuration)
    {
        return loggerConfiguration
            .AddCommonConfig()
            .WriteTo.Async(l => l.File(
                path: configuration["KLog:File:Path"] ?? $"{ThisAssembly.Project.AssemblyName}-.log",
                formatter: MyJsonFormatter.Formatter,
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: configuration.GetValue("KLog:File:RetainedFileCountLimit", 1))
            )
            .WriteTo.Async(l =>
                l.Console(
                    outputTemplate: configuration["KLog:Console:OutputTemplate"] ??
                                    "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}|{Level:u3}|{SourceContext}|{ThreadName}|{ThreadId}|{Message:lj}{Exception}{NewLine}",
                    theme: AnsiConsoleTheme.Code)
            );
    }
}
