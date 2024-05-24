using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Reflection;
using pusher.webapi.Common;

namespace pusher.webapi.Extensions;

/// <summary>
///     只编写了从Field和Property获取attr信息。因为如果一个class有多个Constructor构造方法，它们的名字都会是".ctor"。所以GetXXXFromMember(string
///     memberName)无法实现。或者说使用起来会有歧义
/// </summary>
public static class GetAttrExtension
{
    public static List<EnumObject> EnumToEnumObject<T>(this Type enumType) where T : Enum
    {
        if (!enumType.IsEnum)
        {
            throw new ArgumentException("必须是enum类型");
        }

        var enumList = new List<EnumObject>();
        foreach (T enumValue in Enum.GetValues(enumType))
        {
            enumList.Add(new EnumObject
            {
                EnumKey = Convert.ToInt32(enumValue),
                EnumName = enumValue.ToString(),
                EnumDisplayName = enumValue.GetEnumDisplay()?.Name ?? string.Empty
            });
        }

        return enumList;
    }

    public static List<EnumObject> EnumToEnumObject2<T>(this T enumType) where T : Enum
    {
        var enumList = new List<EnumObject>();
        var t = enumType.GetType();
        foreach (T enumValue in Enum.GetValues(t))
        {
            enumList.Add(new EnumObject
            {
                EnumKey = Convert.ToInt32(enumValue),
                EnumName = enumValue.ToString(),
                EnumDisplayName = enumValue.GetEnumDisplay()?.Name ?? string.Empty
            });
        }

        return enumList;
    }

    #region Display

    /// <summary>
    ///     获取自身DisplayAttribute
    /// </summary>
    /// <param name="type">任何type类型</param>
    /// <returns>所有Description值</returns>
    public static DisplayAttribute? GetSelfDisplay(this Type type)
    {
        var attr = type.GetCustomAttribute(typeof(DisplayAttribute), false) as DisplayAttribute;
        return attr;
    }

    /// <summary>
    ///     通过字段名称，获取DisplayAttribute
    /// </summary>
    /// <param name="type">任何type类型</param>
    /// <param name="fieldName">字段名称</param>
    /// <returns>所有Description值</returns>
    public static DisplayAttribute? GetDisplayByFieldName(this Type type, string fieldName)
    {
        var fields = type.GetFields();
        if (fields.Any(field => field.Name == fieldName))
        {
            var field = fields.First(f => f.Name == fieldName);
            var attr = field.GetCustomAttribute(typeof(DisplayAttribute), false) as DisplayAttribute;
            return attr;
        }

        return null;
    }

    /// <summary>
    ///     获取通过属性名称，获取DisplayAttribute
    /// </summary>
    /// <param name="type">任何type类型</param>
    /// <param name="propertyName">字段名称</param>
    /// <returns>所有Description值</returns>
    public static DisplayAttribute? GetDisplayByPropertyName(this Type type, string propertyName)
    {
        var properties = type.GetProperties();
        if (properties.Any(property => property.Name == propertyName))
        {
            var property = properties.First(p => p.Name == propertyName);
            var attr = property.GetCustomAttribute(typeof(DisplayAttribute), false) as DisplayAttribute;
            return attr;
        }

        return null;
    }

    /// <summary>
    ///     获取枚举的DisplayAttribute
    /// </summary>
    /// <param name="enumValue">枚举类里的值</param>
    /// <returns></returns>
    public static DisplayAttribute? GetEnumDisplay(this Enum enumValue)
    {
        var fieldInfo = enumValue.GetType().GetField(enumValue.ToString());
        var attr = fieldInfo?.GetCustomAttribute(typeof(DisplayAttribute), false) as DisplayAttribute;
        return attr;
    }

    #endregion

    #region Description

    /// <summary>
    ///     获取自身displayDescription属性值
    /// </summary>
    /// <param name="type">任何type类型</param>
    /// <returns>所有Description值</returns>
    public static List<string> GetSelfDescriptions(this Type type)
    {
        var attrs = (DescriptionAttribute[])type.GetCustomAttributes(typeof(DescriptionAttribute), false);
        return attrs.Select(a => a.Description).ToList();
    }

    /// <summary>
    ///     获取通过字段名称，获取Description值
    /// </summary>
    /// <param name="type">任何type类型</param>
    /// <param name="fieldName">字段名称</param>
    /// <returns>所有Description值</returns>
    public static List<string> GetDescriptionsByFieldName(this Type type, string fieldName)
    {
        var fields = type.GetFields();
        foreach (var field in fields)
        {
            if (field.Name == fieldName)
            {
                var attrs = (DescriptionAttribute[])field.GetCustomAttributes(typeof(DescriptionAttribute), false);
                return attrs.Select(a => a.Description).ToList();
            }
        }

        return new List<string>();
    }

    /// <summary>
    ///     获取通过属性名称，获取Description值
    /// </summary>
    /// <param name="type">任何type类型</param>
    /// <param name="propertyName">字段名称</param>
    /// <returns>所有Description值</returns>
    public static List<string> GetDescriptionsByPropertyName(this Type type, string propertyName)
    {
        var properties = type.GetProperties();
        foreach (var property in properties)
        {
            if (property.Name == propertyName)
            {
                var attrs = (DescriptionAttribute[])property.GetCustomAttributes(typeof(DescriptionAttribute), false);
                return attrs.Select(a => a.Description).ToList();
            }
        }

        return new List<string>();
    }

    /// <summary>
    ///     获取枚举的Description值
    /// </summary>
    /// <param name="enumValue">枚举类里的值</param>
    /// <returns></returns>
    public static List<string> GetEnumDescriptions(this Enum enumValue)
    {
        var fieldInfo = enumValue.GetType().GetField(enumValue.ToString());
        var descriptionAttributes =
            (DescriptionAttribute[]?)fieldInfo?.GetCustomAttributes(typeof(DescriptionAttribute), false);
        descriptionAttributes ??= Array.Empty<DescriptionAttribute>();
        return descriptionAttributes.Select(d => d.Description).ToList();
    }

    #endregion
}
