using SqlSugar;

namespace pusher.webapi.Service.Database;

/// <summary>
///     仓储模式
///     https://www.donet5.com/Home/Doc?typeId=1228
/// </summary>
/// <typeparam name="T"></typeparam>
public class Repository<T> : SimpleClient<T> where T : class, new()
{
    public Repository(ISqlSugarClient db) //因为不需要切换仓储所以可以直接用构造函数获取db
    {
        Context = db;
    }
}
