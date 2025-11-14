type LogLevel =
  | 'Verbose'
  | 'Debug'
  | 'Information'
  | 'Warning'
  | 'Error'
  | 'Fatal';

type LoggerConfig = {
  source: string;
  sourcetype: string;
  index: string;
  host: string;
  endpoint: string;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  enrichment?: Record<string, any>;
};

type LogEntry = {
  time: number;
  host: string;
  source: string;
  sourcetype: string;
  index: string;
  event: {
    Level: LogLevel;
    RenderedMessage: string;
    MessageTemplate: string;
    Properties: Record<string, any>;
    Exception?: string;
    [key: string]: any;
  };
};

class BatchLogger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private flushTimer: number | null = null;
  private isFlushing = false;
  private handleBeforeUnload: () => void;
  private handleVisibilityChange: () => void;
  private contextProperties: Record<string, any> = {};
  constructor(config: LoggerConfig) {
    const defaults = {
      batchSize: 10,
      flushInterval: 5000,
      maxRetries: 3,
    };

    this.config = {
      ...defaults,
      ...config,
    };

    this.handleBeforeUnload = () => {
      this.flushSync();
    };
    this.handleVisibilityChange = () => {
      this.onVisibilityChange();
    };

    window.addEventListener('beforeunload', this.handleBeforeUnload);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private onVisibilityChange(): void {
    if (document.hidden) {
      this.flush();
    }
  }

  addContext(properties: Record<string, any>): void {
    this.contextProperties = {
      ...this.contextProperties,
      ...properties,
    };
  }

  clearContext(): void {
    this.contextProperties = {};
  }

  verbose(messageTemplate: string, properties?: Record<string, any>): void {
    this.log('Verbose', messageTemplate, properties);
  }

  debug(messageTemplate: string, properties?: Record<string, any>): void {
    this.log('Debug', messageTemplate, properties);
  }

  information(messageTemplate: string, properties?: Record<string, any>): void {
    this.log('Information', messageTemplate, properties);
  }

  warning(messageTemplate: string, properties?: Record<string, any>): void {
    this.log('Warning', messageTemplate, properties);
  }

  error(
    error: Error,
    messageTemplate: string,
    properties?: Record<string, any>
  ): void {
    this.log('Error', messageTemplate, properties, error);
  }

  fatal(
    error: Error,
    messageTemplate: string,
    properties?: Record<string, any>
  ): void {
    this.log('Fatal', messageTemplate, properties, error);
  }

  private log(
    level: LogLevel,
    messageTemplate: string,
    properties?: Record<string, any>,
    error?: Error
  ): void {
    const props = properties || {};
    const renderedMessage = this.renderMessage(messageTemplate, props);
    const mergedProperties = {
      ...this.contextProperties,
      ...props,
    };
    const logEntry: LogEntry = {
      time: Date.now(),
      host: this.config.host,
      source: this.config.source,
      sourcetype: this.config.sourcetype,
      index: this.config.index,
      event: {
        Level: level,
        RenderedMessage: renderedMessage,
        MessageTemplate: messageTemplate,
        Properties: mergedProperties,
        ...this.config.enrichment,
      },
    };

    if (error) {
      logEntry.event.Exception = error.stack;
    }

    this.logQueue.push(logEntry);

    if (this.logQueue.length >= this.config.batchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(
        () => this.flush(),
        this.config.flushInterval
      );
    }
  }

  private renderMessage(
    template: string,
    properties: Record<string, any>
  ): string {
    let message = template;

    for (const [key, value] of Object.entries(properties)) {
      const placeholder = `{${key}}`;
      message = message.replace(placeholder, String(value));
    }

    return message;
  }

  public flushSync(): void {
    if (this.logQueue.length === 0) return;

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const blob = new Blob([JSON.stringify(logsToSend)], {
      type: 'application/json',
    });
    navigator.sendBeacon(this.config.endpoint, blob);
  }

  public async flush(): Promise<void> {
    if (this.logQueue.length === 0 || this.isFlushing) return;

    this.isFlushing = true;
    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    let retries = 0;
    let success = false;

    while (retries < this.config.maxRetries && !success) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logsToSend),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          success = true;
        } else {
          const shouldRetry = this.shouldRetryError(response.status);
          if (!shouldRetry) {
            console.error(
              `Non-retryable error ${response.status}: ${response.statusText}`
            );
            break;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error: any) {
        retries++;
        if (error.name === 'AbortError') {
          console.error(
            `Request timeout (attempt ${retries}/${this.config.maxRetries})`
          );
        } else {
          console.error(
            `Failed to send logs (attempt ${retries}/${this.config.maxRetries}):`,
            error
          );
        }

        if (retries < this.config.maxRetries) {
          const delay = Math.pow(2, retries) * 1000;
          const jitter = Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay + jitter));
        }
      }
    }
    if (!success) {
      console.warn('Failed to send logs after all retries. Logs:', logsToSend);
    }

    this.isFlushing = false;
  }

  private shouldRetryError(status: number): boolean {
    if (status >= 400 && status < 500) {
      return false;
    }
    return status >= 500;
  }

  public forceFlush(): Promise<void> {
    return this.flush();
  }

  public destroy(): void {
    this.flush();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange
    );
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

export const logger = new BatchLogger({
  source: 'my-app',
  sourcetype: 'ui',
  index: 'my-index',
  host: '127.0.0.1',
  endpoint: 'http://localhost:5244/collector',
  batchSize: 10,
  flushInterval: 5000,
  maxRetries: 3,
  enrichment: {
    ReleaseVersion: '10.0.0',
  },
});
