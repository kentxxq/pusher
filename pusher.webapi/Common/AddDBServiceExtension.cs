using System.Reflection;

namespace pusher.webapi.Common;

public static class AddDBServiceExtension
{
    public static void AddDBService(this IServiceCollection serviceCollection)
    {
        var dbServiceTypes = Assembly.GetExecutingAssembly()
            .GetTypes()
            .Where(t => t.Namespace == $"{ThisAssembly.Project.AssemblyName}.Service.Database" &&
                        t.Name.StartsWith("DB") && t.IsClass)
            .ToList();
        foreach (var type in dbServiceTypes)
        {
            serviceCollection.AddTransient(type);
        }
    }
}
