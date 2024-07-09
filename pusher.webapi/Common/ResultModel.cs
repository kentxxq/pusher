using pusher.webapi.Enums;
using SqlSugar;

namespace pusher.webapi.Common;

public static class ResultModel
{
    public static ResultModel<T> Ok<T>(T data)
    {
        return new ResultModel<T> { Data = data };
    }

    public static ResultModel<T> Error<T>(string message, T errorData, ResultStatus code = ResultStatus.Error)
    {
        return new ResultModel<T> { Code = code, Message = message, Data = errorData };
    }
}

public static class PageDataModel
{
    public static PageDataModel<T> Ok<T>(List<T> pageData, PageModel p)
    {
        return new PageDataModel<T>
            { PageIndex = p.PageIndex, PageSize = p.PageSize, TotalCount = p.TotalCount, PageData = pageData };
    }
}

public class PageDataModel<T>
{
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public List<T> PageData { get; set; }
}

/// <summary>
///     统一返回模型
/// </summary>
/// <typeparam name="T"></typeparam>
public class ResultModel<T>
{
    /// <summary>
    ///     状态码
    /// </summary>
    public ResultStatus Code { get; set; } = ResultStatus.Success;

    /// <summary>
    ///     简要消息
    /// </summary>
    public string Message { get; set; } = ResultStatus.Success.ToStringFast();

    /// <summary>
    ///     数据
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    ///     成功
    /// </summary>
    /// <param name="data">返回数据</param>
    /// <returns></returns>
    // public static ResultModel<T> Ok(T data)
    // {
    //     return new ResultModel<T> { Data = data };
    // }

    /// <summary>
    ///     失败
    /// </summary>
    /// <param name="message">简要消息</param>
    /// <param name="errorData">详细错误信息</param>
    /// <param name="code">状态码</param>
    /// <returns></returns>
    // public static ResultModel<T> Error(string message, T errorData, ResultStatus code = ResultStatus.Error)
    // {
    //     return new ResultModel<T> { Code = code, Message = message, Data = errorData };
    // }
}
