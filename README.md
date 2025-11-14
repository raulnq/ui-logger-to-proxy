# Client-side logs to Splunk

A full-stack logging solution that forwards client-side logs from a React application through an ASP.NET Core proxy server to Splunk. This project demonstrates structured logging, batching strategies, and real-time log forwarding between different technologies.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Client   │───▶│  .NET Server    │───▶│     Splunk      │
│                 │    │                 │    │                 │
│ • BatchLogger   │    │ • Log Proxy     │    │ • Log Storage   │
│ • TypeScript    │    │ • Raw JSON      │    │ • Indexing      │
│ • Structured    │    │   Formatter     │    │ • Search        │
│   Logging       │    │ • Serilog Sink  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Features

### Client-Side (React + TypeScript)

- **Structured Logging**: Template-based logging with typed parameters
- **Batch Processing**: Configurable batching for performance optimization
- **Auto-Flushing**: Smart flushing on page unload and visibility changes
- **Error Handling**: Automatic retry logic with exponential backoff
- **Context Management**: Global context properties for all log entries

### Server-Side (.NET 9)

- **Raw JSON Forwarding**: Preserves original client log structure
- **Custom Formatter**: Passes raw JSON directly to Splunk without modification
- **Batch Processing**: Maintains Serilog's efficient batching to Splunk

### Infrastructure

- **Dockerized Splunk**: Ready-to-run Splunk instance with HEC enabled
- **HTTP Event Collector**: Configured for receiving structured logs
- **Development Environment**: Complete dev setup with hot reload

## 📦 Project Structure

```
├── client/                    # React TypeScript application
│   ├── src/
│   │   ├── App.tsx           # Main UI with logging controls
│   │   ├── logger.ts         # BatchLogger implementation
│   │   └── main.tsx          # Application entry point
│   ├── package.json          # Node.js dependencies
│   └── vite.config.ts        # Vite configuration
│
├── server/                   # ASP.NET Core proxy server
│   ├── Program.cs            # Main server logic and endpoints
│   ├── RawJsonFormatter.cs   # Custom Splunk formatter
│   └── server.csproj         # .NET project file
│
├── docker-compose.yaml       # Splunk container configuration
└── README.md                 # This file
```

## 🛠️ Prerequisites

- **Node.js 24+** (for React client)
- **.NET 9 SDK** (for server)
- **Docker & Docker Compose** (for Splunk)
- **Git** (for cloning)

## ⚡ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/raulnq/ui-logger-to-proxy.git
cd ui-logger-to-proxy
```

### 2. Start Splunk

```bash
docker-compose up -d
```

Wait for Splunk to start (3-5 minutes). Check status:

```bash
docker-compose ps
```

> Don't forget to create an Splunk's index.

### 3. Start the .NET Server

```bash
cd server
dotnet run
```

Server will start on `http://localhost:5244`

### 4. Start the React Client

```bash
cd client
npm install
npm run dev
```

Client will start on `http://localhost:5173`

### 5. Access Applications

- **React App**: http://localhost:5173
- **.NET Server**: http://localhost:5244
- **Splunk Web**: http://localhost:8000 (admin/splunk123456.)

## 🔧 Configuration

### Client Logger Configuration

```typescript
export const logger = new BatchLogger({
  source: "my-app",
  sourcetype: "ui",
  index: "my-index",
  host: "127.0.0.1",
  endpoint: "http://localhost:5244/collector",
  batchSize: 10,
  flushInterval: 5000,
  maxRetries: 3,
  enrichment: {
    ReleaseVersion: "10.0.0",
  },
});
```

### Splunk Configuration

The docker-compose.yaml configures:

- **HEC Token**: `abc`
- **Port**: 8088 (HTTP Event Collector)
- **HEC SSL**: Disabled for development

### Server Configuration

```csharp
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
```

## 📚 Usage Examples

### Basic Logging

```typescript
// Information log
logger.information("User logged in", { UserId: "12345" });

// Warning with context
logger.warning("Slow response detected", {
  ResponseTime: 2500,
  Endpoint: "/api/users",
});

// Error with exception
logger.error(new Error("Network timeout"), "Failed to fetch data");
```

### Template-based Logging

```typescript
logger.information("Processed {Count} items in {Duration}ms", {
  Count: 150,
  Duration: 2340,
});
// Renders to: "Processed 150 items in 2340ms"
```

### Global Context

```typescript
logger.addContext({
  SessionId: "sess_123456",
  UserAgent: navigator.userAgent,
});

// All subsequent logs will include these properties
```

## 🎯 Testing the Setup

1. **Open the React app** at http://localhost:5173
2. **Enter a message** in the text area
3. **Click "Send Log Message"** or **"Send Error Log"**
4. **Check the server console** for received logs
5. **Access Splunk** at http://localhost:8000
6. **Search for logs** using: `index="my-index"`

## 📊 Log Structure

Logs are structured with the following format:

```json
{
  "time": 1731506234,
  "host": "web-client",
  "source": "my-app",
  "sourcetype": "json",
  "index": "my-index",
  "event": {
    "Level": "Information",
    "RenderedMessage": "User message: Hello World!",
    "MessageTemplate": "User message: {Message}",
    "Properties": {
      "Message": "Hello World!",
      "LocalIP": "192.168.1.100",
      "UserName": "johndoe@gmail.com",
      "BuildNumber": "1.0.0",
      "Environment": "Development"
    }
  }
}
```

## 📈 Performance Considerations

### Client-Side

- **Batch Size**: Larger batches reduce requests but increase memory usage
- **Flush Interval**: Balance between real-time delivery and performance
- **Retry Strategy**: Exponential backoff prevents overwhelming the server

### Server-Side

- **JSON Serialization**: Uses efficient System.Text.Json
- **Null Handling**: Excludes null properties to reduce payload size
- **Serilog Batching**: Leverages Serilog's optimized batching to Splunk

## 🔒 Security Notes

⚠️ **This setup is for development only**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

For questions or issues:

1. Check the [Issues](https://github.com/raulnq/ui-logger-to-proxy/issues) page
2. Create a new issue with detailed information
3. Include logs and configuration details
