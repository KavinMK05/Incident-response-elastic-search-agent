export const SERVICES = [
  'payment-service',
  'checkout-service',
  'user-service',
  'inventory-service',
  'notification-service',
];

export const ERROR_TYPES = [
  { type: 'SocketTimeoutException', message: 'Connection to payment-gateway timed out after 30s' },
  { type: 'ConnectionRefusedException', message: 'Connection refused to payment-gateway' },
  { type: 'PaymentDeclinedException', message: 'Payment was declined by payment gateway: insufficient funds' },
  { type: 'ServiceUnavailableException', message: 'External service payment-gateway is unavailable' },
];

export const INFO_MESSAGES = [
  'Request processed successfully',
  'Order created',
  'Payment initiated',
  'User session started',
  'Health check passed',
];

export function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateTraceId(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return Array.from({ length: 32 }, hex).join('');
}

export function generateTimestamp(baseTime: Date, offsetMinutes: number): string {
  const time = new Date(baseTime.getTime() + offsetMinutes * 60000 + randomInt(0, 59000));
  return time.toISOString();
}

export interface AppLog {
  '@timestamp': string;
  service: string;
  level: string;
  message: string;
  logger: string;
  trace_id: string;
  environment: string;
  exception?: {
    type: string;
    message: string;
    stacktrace: string;
  };
}

export function generateAppLogs(baseTime: Date, count: number, spikeService?: string, spikeRate: number = 0): AppLog[] {
  const logs: AppLog[] = [];

  for (let i = 0; i < count; i++) {
    const service = spikeService || randomChoice(SERVICES);
    const isErrorSpike = spikeService && Math.random() < spikeRate;
    const isError = isErrorSpike || (!spikeService && Math.random() < 0.05);

    let level: string;
    let message: string;
    let errorType: { type: string; message: string } | undefined;

    if (isError) {
      level = isErrorSpike ? (Math.random() < 0.1 ? 'FATAL' : 'ERROR') : 'ERROR';
      errorType = randomChoice(ERROR_TYPES);
      message = errorType.message;
    } else {
      level = 'INFO';
      message = randomChoice(INFO_MESSAGES);
    }

    const log: AppLog = {
      '@timestamp': generateTimestamp(baseTime, (i / count) * 60),
      service,
      level,
      message,
      logger: `com.company.${service.replace(/-/g, '')}.Service`,
      trace_id: generateTraceId(),
      environment: 'production',
    };

    if (errorType) {
      log.exception = {
        type: errorType.type,
        message: errorType.message,
        stacktrace: `${errorType.type}: ${errorType.message}\n\tat com.company.service.Service.process(Service.java:${randomInt(50, 200)})`,
      };
    }

    logs.push(log);
  }

  return logs;
}

export interface Trace {
  '@timestamp': string;
  trace_id: string;
  span_id: string;
  parent_span_id: string;
  service: string;
  operation: string;
  duration_ms: number;
  status: string;
  error?: {
    type: string;
    message: string;
  };
}

export function generateTraces(baseTime: Date, count: number, spikeService?: string, spikeRate: number = 0): Trace[] {
  const traces: Trace[] = [];
  const operations = ['POST /api/v1/payments', 'GET /api/v1/orders', 'POST /api/v1/checkout'];

  for (let i = 0; i < count; i++) {
    const service = spikeService || randomChoice(SERVICES);
    const isErrorSpike = spikeService && Math.random() < spikeRate;
    const isError = isErrorSpike || Math.random() < 0.05;

    const trace: Trace = {
      '@timestamp': generateTimestamp(baseTime, (i / count) * 60),
      trace_id: generateTraceId(),
      span_id: `span_${randomInt(100000, 999999)}`,
      parent_span_id: `span_${randomInt(100000, 999999)}`,
      service,
      operation: randomChoice(operations),
      duration_ms: isError ? randomInt(5000, 30000) : randomInt(50, 500),
      status: isError ? 'error' : 'ok',
    };

    if (isError) {
      const errorType = randomChoice(ERROR_TYPES);
      trace.error = {
        type: errorType.type,
        message: errorType.message,
      };
    }

    traces.push(trace);
  }

  return traces;
}

export interface Deployment {
  '@timestamp': string;
  service: string;
  version: string;
  previous_version: string;
  environment: string;
  deployed_by: string;
  deployment_id: string;
  commit: {
    hash: string;
    message: string;
    author: string;
    branch: string;
  };
  status: string;
}

export function generateDeployments(): Deployment[] {
  const now = Date.now();

  return [
    {
      '@timestamp': new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      service: 'payment-service',
      version: '2.4.1',
      previous_version: '2.4.0',
      environment: 'production',
      deployed_by: 'john.doe@company.com',
      deployment_id: 'deploy_payment_001',
      commit: {
        hash: 'a1b2c3d4e5f6',
        message: 'Increase payment gateway timeout from 10s to 30s',
        author: 'jane.smith@company.com',
        branch: 'main',
      },
      status: 'success',
    },
    {
      '@timestamp': new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      service: 'checkout-service',
      version: '3.2.0',
      previous_version: '3.1.5',
      environment: 'production',
      deployed_by: 'alice.wong@company.com',
      deployment_id: 'deploy_checkout_001',
      commit: {
        hash: 'abcdef123456',
        message: 'Add cart persistence layer',
        author: 'bob.chen@company.com',
        branch: 'main',
      },
      status: 'success',
    },
  ];
}

export interface Alert {
  '@timestamp': string;
  alert_id: string;
  alert_type: string;
  service: string;
  severity: string;
  threshold: number;
  current_value: number;
  baseline_value: number;
  trigger: string;
  context: {
    window_start: string;
    window_end: string;
    error_count: number;
  };
}

export function generateAlerts(): Alert[] {
  return [
    {
      '@timestamp': new Date().toISOString(),
      alert_id: 'alert_error_spike_001',
      alert_type: 'error_spike',
      service: 'payment-service',
      severity: 'high',
      threshold: 5.0,
      current_value: 18.5,
      baseline_value: 0.3,
      trigger: 'error_rate > threshold for 5 minutes',
      context: {
        window_start: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        window_end: new Date().toISOString(),
        error_count: 1847,
      },
    },
  ];
}
