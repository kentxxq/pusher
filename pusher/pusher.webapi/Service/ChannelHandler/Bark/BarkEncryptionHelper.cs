using System.Security.Cryptography;
using System.Text;
using pusher.webapi.Models;
using pusher.webapi.Models.DB;

namespace pusher.webapi.Service.ChannelHandler.Bark;

public static class BarkEncryptionHelper
{
    public static string Encrypt(string content, BarkChannelConfig config)
    {
        if (config.EncryptionMode == BarkEncryptionMode.None || string.IsNullOrEmpty(config.EncryptionKey))
        {
            return content;
        }

        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(config.EncryptionKey);
        
        switch (config.EncryptionMode)
        {
            case BarkEncryptionMode.AES128CBC:
            case BarkEncryptionMode.AES256CBC:
                aes.Mode = CipherMode.CBC;
                if (!string.IsNullOrEmpty(config.EncryptionIv))
                {
                    aes.IV = Encoding.UTF8.GetBytes(config.EncryptionIv);
                }
                break;
            case BarkEncryptionMode.AES128ECB:
            case BarkEncryptionMode.AES256ECB:
                aes.Mode = CipherMode.ECB;
                break;
            default:
                throw new ArgumentOutOfRangeException();
        }

        aes.Padding = PaddingMode.PKCS7;

        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        var inputBytes = Encoding.UTF8.GetBytes(content);
        var encryptedBytes = encryptor.TransformFinalBlock(inputBytes, 0, inputBytes.Length);

        return Convert.ToBase64String(encryptedBytes);
    }
}
