using Quartz;
using Quartz.AspNetCore;

namespace pusher.webapi.Jobs;

public static class MyQuartz
{
    public static void AddMyQuartz(this WebApplicationBuilder builder)
    {
        // 启用quartz定时器
        builder.Services.Configure<QuartzOptions>(builder.Configuration.GetSection("Quartz"));
        builder.Services.AddQuartz(q =>
        {
            q.ScheduleJob<DatabaseInit>(trigger =>
            {
                trigger.WithIdentity(nameof(DatabaseInit), "default")
                    .StartNow()
                    .WithDescription("数据库初始化");
            });

            q.ScheduleJob<CleanUselessInfo>(trigger =>
            {
                trigger
                    .WithIdentity(nameof(CleanUselessInfo), "default")
                    .WithCronSchedule(
                        "0 0 2 * * ?") // 每天凌晨2点 https://www.quartz-scheduler.net/documentation/quartz-3.x/tutorial/crontriggers.html
                    .WithDescription("删除没有使用的用户");
            });


            // q.ScheduleJob<DataJob>(trigger =>
            // {
            //     trigger
            //         .WithIdentity("datajob", "group2")
            //         .UsingJobData("data", "datajob-data")
            //         .StartNow()
            //         .WithCronSchedule("5 * * * * ?")
            //         .WithDescription("datajob task");
            // });

            //var jobKey = new JobKey("awesome job", "awesome group");
            //q.AddJob<HelloJob>(jobKey, j => j
            //    .WithDescription("my awesome job")
            //);

            //q.AddTrigger(t => t
            //    .WithIdentity("Simple Trigger")
            //    .ForJob(jobKey)
            //    .StartNow()
            //    .WithSimpleSchedule(x => x.WithInterval(TimeSpan.FromSeconds(10)).RepeatForever())
            //    .WithDescription("my awesome simple trigger")
            //);

            //q.AddTrigger(t => t
            //    .WithIdentity("Cron Trigger")
            //    .ForJob(jobKey)
            //    .StartAt(DateBuilder.EvenSecondDate(DateTimeOffsetOffset.UtcNow.AddSeconds(3)))
            //    .WithCronSchedule("0/3 * * * * ?")
            //    .WithDescription("my awesome cron trigger")
            //);
        });
        builder.Services.AddQuartzServer(option => { option.WaitForJobsToComplete = true; });
    }
}
