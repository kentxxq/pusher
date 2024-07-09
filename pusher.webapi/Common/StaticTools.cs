using SqlSugar;

namespace pusher.webapi.Common;

public static class StaticTools
{
    public static PageModel CreatePageModel(int pageIndex, int PageSize)
    {
        return new PageModel { PageIndex = pageIndex, PageSize = PageSize };
    }
}
