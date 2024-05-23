using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;

namespace pusher.webapi.Common;

/// <summary>
///     swagger-拓展方法
/// </summary>
public static class MySwaggerExtension
{
    /// <summary>
    ///     添加swagger配置
    /// </summary>
    /// <param name="service"></param>
    /// <returns></returns>
    public static IServiceCollection AddMySwagger(this IServiceCollection service)
    {
        service.AddEndpointsApiExplorer();
        service.AddSwaggerGen(s =>
        {
            // 创建一个 /swagger/v1/swagger.json 路径，controller里的groupname要和name一致。OpenApiInfo是让这个页面里写着 kentxxq.Kscheduler.webapi v1
            s.SwaggerDoc("v1", new OpenApiInfo { Title = ThisAssembly.Project.AssemblyName, Version = "v1" });
            s.SwaggerDoc("v2", new OpenApiInfo { Title = ThisAssembly.Project.AssemblyName, Version = "v2" });

            // JWT
            s.AddSecurityDefinition("bearerAuth", new OpenApiSecurityScheme
            {
                // http是Header带 Authorization: Bearer ZGVtbzpwQDU1dzByZA==
                // apikey 是下面3中方式
                // 参数带 /something?api_key=abcdef12345
                // header带 X-API-Key: abcdef12345
                // cookie带 Cookie: X-API-KEY=abcdef12345
                Type = SecuritySchemeType.Http, // 这里http,swagger添加token会报错,无解
                In = ParameterLocation.Header,
                Name = JwtBearerDefaults.AuthenticationScheme,
                Scheme = JwtBearerDefaults.AuthenticationScheme,
                // BearerFormat = "JWT",
                Description = "JWT授权(数据将在请求头中进行传输) 直接在下框中输入token即可"
            });
            s.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "bearerAuth" }
                    },
                    Array.Empty<string>()
                }
            });

            // xmlDoc
            var filePath = Path.Combine(AppContext.BaseDirectory, "MyApi.xml");
            s.IncludeXmlComments(filePath);
        });

        return service;
    }
}
