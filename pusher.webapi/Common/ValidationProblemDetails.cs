using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace pusher.webapi.Common;

public static class ValidationProblemDetails
{
    private static string GetErrorMessage(ModelError error)
    {
        return string.IsNullOrEmpty(error.ErrorMessage) ? "The input was not valid." : error.ErrorMessage;
    }

    public static IActionResult MakeValidationResponse(ActionContext context)
    {
        var result = string.Empty;
        foreach (var keyModelStatePair in context.ModelState)
        {
            var errors = keyModelStatePair.Value.Errors;
            if (errors != null && errors.Count > 0)
            {
                if (errors.Count == 1)
                {
                    var errorMessage = GetErrorMessage(errors[0]);
                    result = errorMessage;
                }
                else
                {
                    var errorMessages = new string[errors.Count];
                    for (var i = 0; i < errors.Count; i++)
                    {
                        errorMessages[i] = GetErrorMessage(errors[i]);
                        result = string.Join(";", errorMessages);
                    }
                }
            }
        }

        return new JsonResult(ResultModel.Error("参数验证错误", result));
    }
}
