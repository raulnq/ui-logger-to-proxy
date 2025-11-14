using Serilog.Events;
using Serilog.Formatting;
// https://github.com/serilog-contrib/serilog-sinks-splunk/blob/dev/src/Serilog.Sinks.Splunk/Sinks/Splunk/SplunkJsonFormatter.cs
public class RawJsonFormatter : ITextFormatter
{
    public void Format(Serilog.Events.LogEvent logEvent, TextWriter output)
    {
        if (logEvent.Properties.TryGetValue("RawJson", out var rawJsonProperty) &&
            rawJsonProperty is ScalarValue scalarValue &&
            scalarValue.Value is string rawJson)
        {
            output.Write(rawJson);
        }
        else
        {
            throw new NotSupportedException("RawJsonFormatter only supports log events with RawJson property");
        }
    }
}
