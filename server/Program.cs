using System.Text.Json;
using System.Text.Json.Serialization;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.EventCollector(
        "http://localhost:8088",
        "abc",
        new RawJsonFormatter(),
        "services/collector/event",
        LogEventLevel.Information,
        2,
        100,
        1000
    )
    .CreateLogger();

builder.Services.AddCors(options =>
{
  options.AddDefaultPolicy(policy =>
  {
    policy.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
  });
});

var app = builder.Build();

app.UseCors();

var jsonOptions = new JsonSerializerOptions
{
  DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};

app.MapPost("/collector", (LogEntry[] logEntries) =>
{
  if (logEntries != null && logEntries.Length > 0)
  {

    foreach (var logEntry in logEntries)
    {
      var individualJson = JsonSerializer.Serialize(logEntry, jsonOptions);
      Log.Logger.ForwardToSplunk(individualJson);
    }
  }

  return Results.Ok(new { timestamp = DateTime.UtcNow });
});

app.Run();

Log.CloseAndFlush();

public class LogEntry
{
  [JsonPropertyName("source")]
  public string? Source { get; set; }
  [JsonPropertyName("sourcetype")]
  public string? SourceType { get; set; }
  [JsonPropertyName("host")]
  public string? Host { get; set; }
  [JsonPropertyName("index")]
  public string? Index { get; set; }
  [JsonPropertyName("time")]
  public long Time { get; set; }
  [JsonPropertyName("event")]
  public LogEvent? Event { get; set; }

};

public record LogEvent(
    string Level,
    string RenderedMessage,
    string MessageTemplate,
    string? Exception,
    Dictionary<string, JsonElement> Properties
)
{
  [JsonExtensionData]
  public Dictionary<string, JsonElement>? ExtensionData { get; init; }
}
