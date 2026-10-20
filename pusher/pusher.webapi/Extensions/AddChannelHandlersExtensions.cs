using System.Reflection;
using pusher.webapi.Service.ChannelHandler;

namespace pusher.webapi.Extensions;

public static class AddChannelHandlersExtensions
{
    public static IServiceCollection AddChannelHandlers(this IServiceCollection services)
    {
        // 获取所有实现了 IChannelHandler 接口的类型
        var handlerTypes = Assembly.GetExecutingAssembly()
            .GetTypes()
            .Where(t => typeof(IChannelHandler).IsAssignableFrom(t) && t.IsClass && !t.IsAbstract)
            .ToList();

        // 将这些类型注册为 Scoped 服务
        foreach (var handlerType in handlerTypes)
        {
            services.AddScoped(typeof(IChannelHandler), handlerType);
        }

        return services;
    }
}
