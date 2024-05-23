using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace pusher.webapi.Common;

public class RandomString
{
    /// <summary>
    ///     生成随机字符串
    /// </summary>
    /// <param name="length">目标字符串的长度</param>
    /// <param name="useNum">是否包含数字，1=包含，默认为包含</param>
    /// <param name="useLow">是否包含小写字母，1=包含，默认为包含</param>
    /// <param name="useUpp">是否包含大写字母，1=包含，默认为包含</param>
    /// <param name="useSpe">是否包含特殊字符，1=包含，默认为不包含</param>
    /// <param name="custom">要包含的自定义字符，直接输入要包含的字符列表</param>
    /// <returns>指定长度的随机字符串</returns>
    public static string GetRandomString(int length, bool useNum, bool useLow, bool useUpp, bool useSpe = false,
        string custom = "")
    {
        //var b = new byte[4];
        //new System.Security.Cryptography.RNGCryptoServiceProvider().GetBytes(b);
        //RandomNumberGenerator.GetBytes(b);
        //var r = new Random(BitConverter.ToInt32(b, 0));
        string s = "", str = custom;
        if (useNum)
        {
            str += "0123456789";
        }

        if (useLow)
        {
            str += "abcdefghijklmnopqrstuvwxyz";
        }

        if (useUpp)
        {
            str += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        }

        if (useSpe)
        {
            str += "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
        }

        for (var i = 0; i < length; i++)
        {
            s += str.Substring(RandomNumberGenerator.GetInt32(0, str.Length), 1);
        }

        return s;
    }

    public static bool CheckPasswordStrong(string password)
    {
        var hasNumber = new Regex(@"[0-9]+");
        var hasUpperChar = new Regex(@"[A-Z]+");
        var hasLowerChar = new Regex(@"[a-z]+");
        var hasMinimum8Chars = new Regex(@".{8,}");

        var isValidated = hasNumber.IsMatch(password) && hasUpperChar.IsMatch(password) &&
                          hasMinimum8Chars.IsMatch(password) && hasLowerChar.IsMatch(password);
        return isValidated;
    }
}
