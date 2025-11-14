using ILogger = Serilog.ILogger;

public static class SplunkJsonLoggerExtensions
{
    public static void ForwardToSplunk(this ILogger logger, string rawJson)
    {
        logger.Information("Raw JSON data received from client {@RawJson}", rawJson);
    }
}
