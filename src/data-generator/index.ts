import { Client } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SERVICES = [
  'payment-service',
  'checkout-service',
  'user-service',
  'inventory-service',
  'notification-service',
  'fraud-service',
  'subscription-service',
  'order-service',
];

const ERROR_TYPES = [
  { type: 'SocketTimeoutException', message: 'Connection to payment-gateway timed out after 30s' },
  { type: 'ConnectionRefusedException', message: 'Connection refused to payment-gateway' },
  { type: 'NullPointerException', message: 'Null pointer exception while processing payment request' },
  { type: 'DatabaseConnectionException', message: 'Failed to establish database connection' },
  { type: 'PaymentDeclinedException', message: 'Payment was declined by payment gateway: insufficient funds' },
  { type: 'RateLimitExceededException', message: 'Rate limit exceeded for payment-gateway API' },
  { type: 'ServiceUnavailableException', message: 'External service payment-gateway is unavailable' },
  { type: 'AuthenticationFailedException', message: 'Failed to authenticate with payment provider' },
];

const INFO_MESSAGES = [
  'Request processed successfully',
  'Order created',
  'Payment initiated',
  'User session started',
  'Cache refreshed',
  'Health check passed',
  'Connection pool initialized',
  'Configuration loaded',
];

const WARN_MESSAGES = [
  'High latency detected in response',
  'Cache miss for frequently accessed key',
  'Connection pool running low',
  'Slow query detected',
  'Memory usage above threshold',
  'Retry attempt 2 of 3',
];

function createClient(): Client {
  const cloudId = process.env.ELASTIC_CLOUD_ID;
  const node = process.env.ELASTIC_NODE;
  const apiKey = process.env.ELASTIC_API_KEY;
  const username = process.env.ELASTIC_USERNAME;
  const password = process.env.ELASTIC_PASSWORD;

  if (cloudId && apiKey) {
    return new Client({
      cloud: { id: cloudId },
      auth: { apiKey },
    });
  }

  if (node) {
    if (apiKey) {
      return new Client({
        node,
        auth: { apiKey },
      });
    }
    if (username && password) {
      return new Client({
        node,
        auth: { username, password },
      });
    }
  }

  throw new Error('Missing Elasticsearch configuration. Check your .env file.');
}

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateId(prefix: string): string {
  return `${prefix}_${randomInt(10000, 99999)}`;
}

function generateTraceId(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return Array.from({ length: 32 }, hex).join('');
}

function generateTimestamp(baseTime: Date, offsetMinutes: number): string {
  const time = new Date(baseTime.getTime() + offsetMinutes * 60000 + randomInt(0, 59000));
  return time.toISOString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateAppLogs(baseTime: Date, count: number, spikeService?: string, spikeRate: number = 0): any[] {
  const logs: any[] = [];

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
    } else if (Math.random() < 0.15) {
      level = 'WARN';
      message = randomChoice(WARN_MESSAGES);
    } else {
      level = 'INFO';
      message = randomChoice(INFO_MESSAGES);
    }

    const log: Record<string, unknown> = {
      '@timestamp': generateTimestamp(baseTime, (i / count) * 60),
      service,
      level,
      message,
      logger: `com.company.${service.replace(/-/g, '')}.Service`,
      trace_id: generateTraceId(),
      thread: `http-nio-8080-exec-${randomInt(1, 20)}`,
      environment: 'production',
    };

    log.host = {
      name: `${service}-pod-${randomChoice(['a1b2', 'c3d4', 'e5f6', 'g7h8'])}`,
      ip: `10.0.${randomInt(1, 50)}.${randomInt(1, 255)}`,
    };

    if (errorType) {
      log.exception = {
        type: errorType.type,
        message: errorType.message,
        stacktrace: `${errorType.type}: ${errorType.message}\n\tat com.company.service.Service.process(Service.java:${randomInt(50, 200)})\n\tat com.company.service.Service.handle(Service.java:${randomInt(20, 100)})`,
      };
      log.context = {
        user_id: generateId('user'),
        request_id: generateId('req'),
        payment_amount: (Math.random() * 500 + 10).toFixed(2),
      };
    }

    logs.push(log);
  }

  return logs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateAccessLogs(baseTime: Date, count: number, spikeService?: string, spikeRate: number = 0): any[] {
  const logs: any[] = [];
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const paths = [
    '/api/v1/payments',
    '/api/v1/orders',
    '/api/v1/users',
    '/api/v1/products',
    '/api/v1/checkout',
    '/api/v1/subscriptions',
  ];

  for (let i = 0; i < count; i++) {
    const service = spikeService || randomChoice(SERVICES);
    const isErrorSpike = spikeService && Math.random() < spikeRate;
    const method = randomChoice(methods);
    const pathChoice = randomChoice(paths);

    let statusCode: number;
    let responseTime: number;

    if (isErrorSpike) {
      statusCode = randomChoice([500, 502, 503, 504, 504, 504]);
      responseTime = randomInt(5000, 30000);
    } else if (Math.random() < 0.05) {
      statusCode = randomChoice([400, 401, 403, 404, 429]);
      responseTime = randomInt(10, 100);
    } else {
      statusCode = randomChoice([200, 200, 200, 201, 204]);
      responseTime = randomInt(20, 500);
    }

    logs.push({
      '@timestamp': generateTimestamp(baseTime, (i / count) * 60),
      service,
      method,
      path: pathChoice,
      status_code: statusCode,
      response_time_ms: responseTime,
      request_size_bytes: randomInt(100, 2000),
      response_size_bytes: randomInt(100, 10000),
      client_ip: `${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`,
      user_agent: randomChoice([
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'MobileApp/2.1.0 (Android 11)',
        'CompanySDK/1.5.0',
      ]),
      trace_id: generateTraceId(),
      user_id: generateId('user'),
      host: `${service}-pod-${randomChoice(['a1b2', 'c3d4'])}`,
    });
  }

  return logs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateTraces(baseTime: Date, count: number, spikeService?: string, spikeRate: number = 0): any[] {
  const traces: any[] = [];
  const operations = ['POST /api/v1/payments', 'GET /api/v1/orders', 'POST /api/v1/checkout'];

  for (let i = 0; i < count; i++) {
    const service = spikeService || randomChoice(SERVICES);
    const isErrorSpike = spikeService && Math.random() < spikeRate;
    const isError = isErrorSpike || Math.random() < 0.05;

    const trace: Record<string, unknown> = {
      '@timestamp': generateTimestamp(baseTime, (i / count) * 60),
      trace_id: generateTraceId(),
      span_id: `span_${randomInt(100000, 999999)}`,
      parent_span_id: `span_${randomInt(100000, 999999)}`,
      service,
      operation: randomChoice(operations),
      duration_ms: isError ? randomInt(5000, 30000) : randomInt(50, 500),
      status: isError ? 'error' : 'ok',
      tags: {
        'http.status_code': isError ? randomChoice([500, 502, 503, 504]) : 200,
        'http.method': 'POST',
        user_id: generateId('user'),
      },
    };

    if (isError) {
      const errorType = randomChoice(ERROR_TYPES);
      trace.error = {
        type: errorType.type,
        message: errorType.message,
      };

      if (service === 'payment-service') {
        trace.dependencies = [
          {
            service: 'payment-gateway',
            operation: 'POST /v1/charges',
            duration_ms: randomInt(10000, 30000),
            status: 'error',
          },
        ];
      }
    }

    traces.push(trace);
  }

  return traces;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateDeployments(): any[] {
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
        hash: 'a1b2c3d4e5f6789012345678',
        message: 'Increase payment gateway timeout from 10s to 30s',
        author: 'jane.smith@company.com',
        branch: 'main',
      },
      changes: [
        { file: 'src/config/gateway.yml', change_type: 'modified' },
        { file: 'src/services/PaymentClient.java', change_type: 'modified' },
      ],
      deployment_method: 'rolling',
      rollback_available: true,
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
        hash: 'abcdef1234567890abcdef12',
        message: 'Add cart persistence layer with Redis backend',
        author: 'bob.chen@company.com',
        branch: 'main',
      },
      changes: [
        { file: 'src/services/CartService.java', change_type: 'modified' },
        { file: 'src/repositories/CartRepository.java', change_type: 'added' },
      ],
      deployment_method: 'blue-green',
      rollback_available: true,
      status: 'success',
    },
    {
      '@timestamp': new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      service: 'user-service',
      version: '1.8.5',
      previous_version: '1.8.4',
      environment: 'production',
      deployed_by: 'sarah.jones@company.com',
      deployment_id: 'deploy_user_001',
      commit: {
        hash: '9876543210abcdef98765432',
        message: 'Fix session timeout handling',
        author: 'mike.wilson@company.com',
        branch: 'main',
      },
      changes: [
        { file: 'src/auth/SessionManager.java', change_type: 'modified' },
      ],
      deployment_method: 'rolling',
      rollback_available: true,
      status: 'success',
    },
    {
      '@timestamp': new Date(now - 48 * 60 * 60 * 1000).toISOString(),
      service: 'inventory-service',
      version: '2.1.0',
      previous_version: '2.0.8',
      environment: 'production',
      deployed_by: 'david.lee@company.com',
      deployment_id: 'deploy_inventory_001',
      commit: {
        hash: 'fedcba0987654321fedcba09',
        message: 'Optimize inventory queries for high traffic',
        author: 'emma.davis@company.com',
        branch: 'release/2.1',
      },
      changes: [
        { file: 'src/db/InventoryRepository.java', change_type: 'modified' },
        { file: 'src/cache/InventoryCache.java', change_type: 'added' },
      ],
      deployment_method: 'rolling',
      rollback_available: true,
      status: 'success',
    },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateServiceTopology(): any[] {
  return [
    {
      service: 'payment-service',
      version: '2.4.1',
      tier: 'backend',
      team: 'payments-team',
      dependencies: {
        upstream: ['checkout-service', 'subscription-service'],
        downstream: ['payment-gateway', 'fraud-service', 'notification-service'],
      },
      runbook_url: 'https://wiki.company.com/runbooks/payment-service',
      oncall_team: 'payments-oncall',
      slack_channel: '#payments-alerts',
      criticality: 'tier-1',
    },
    {
      service: 'checkout-service',
      version: '3.2.0',
      tier: 'backend',
      team: 'checkout-team',
      dependencies: {
        upstream: ['web-frontend', 'mobile-app'],
        downstream: ['payment-service', 'inventory-service', 'user-service', 'notification-service'],
      },
      runbook_url: 'https://wiki.company.com/runbooks/checkout-service',
      oncall_team: 'checkout-oncall',
      slack_channel: '#checkout-alerts',
      criticality: 'tier-1',
    },
    {
      service: 'user-service',
      version: '1.8.5',
      tier: 'backend',
      team: 'identity-team',
      dependencies: {
        upstream: ['checkout-service', 'subscription-service', 'notification-service'],
        downstream: ['auth-provider', 'user-database'],
      },
      runbook_url: 'https://wiki.company.com/runbooks/user-service',
      oncall_team: 'identity-oncall',
      slack_channel: '#identity-alerts',
      criticality: 'tier-2',
    },
    {
      service: 'inventory-service',
      version: '2.1.0',
      tier: 'backend',
      team: 'inventory-team',
      dependencies: {
        upstream: ['checkout-service', 'order-service'],
        downstream: ['inventory-database', 'warehouse-service'],
      },
      runbook_url: 'https://wiki.company.com/runbooks/inventory-service',
      oncall_team: 'inventory-oncall',
      slack_channel: '#inventory-alerts',
      criticality: 'tier-2',
    },
    {
      service: 'notification-service',
      version: '1.5.2',
      tier: 'backend',
      team: 'platform-team',
      dependencies: {
        upstream: ['payment-service', 'checkout-service', 'user-service'],
        downstream: ['email-provider', 'sms-provider', 'push-notification-service'],
      },
      runbook_url: 'https://wiki.company.com/runbooks/notification-service',
      oncall_team: 'platform-oncall',
      slack_channel: '#platform-alerts',
      criticality: 'tier-2',
    },
    {
      service: 'fraud-service',
      version: '2.0.1',
      tier: 'backend',
      team: 'risk-team',
      dependencies: {
        upstream: ['payment-service'],
        downstream: ['ml-model-service', 'rules-engine'],
      },
      runbook_url: 'https://wiki.company.com/runbooks/fraud-service',
      oncall_team: 'risk-oncall',
      slack_channel: '#risk-alerts',
      criticality: 'tier-1',
    },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateMetrics(baseTime: Date, count: number, spikeService?: string): any[] {
  const metrics: any[] = [];

  for (let i = 0; i < count; i++) {
    const service = spikeService || randomChoice(SERVICES);
    const isErrorSpike = spikeService && i > count * 0.7;

    metrics.push({
      '@timestamp': generateTimestamp(baseTime, i),
      service,
      host: `${service}-pod-${randomChoice(['a1b2', 'c3d4'])}`,
      cpu_percent: isErrorSpike ? randomInt(70, 95) : randomInt(20, 60),
      memory_used_mb: randomInt(800, 1500),
      memory_total_mb: 2048,
      memory_percent: randomInt(40, 75),
      disk_io_read_mb: randomInt(10, 100),
      disk_io_write_mb: randomInt(5, 50),
      network_in_kb: randomInt(500, 2000),
      network_out_kb: randomInt(1000, 4000),
      gc_pause_ms: randomInt(10, 100),
      thread_count: randomInt(100, 200),
      request_rate: isErrorSpike ? randomInt(50, 150) : randomInt(200, 500),
      error_rate: isErrorSpike ? randomInt(10, 25) : randomInt(0, 2),
      latency_p50_ms: isErrorSpike ? randomInt(500, 1500) : randomInt(50, 150),
      latency_p95_ms: isErrorSpike ? randomInt(3000, 8000) : randomInt(200, 500),
      latency_p99_ms: isErrorSpike ? randomInt(15000, 30000) : randomInt(500, 1500),
    });
  }

  return metrics;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateAlerts(): any[] {
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
        error_count: 2847,
        affected_endpoints: ['/api/v1/payments', '/api/v1/refunds'],
      },
    },
    {
      '@timestamp': new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      alert_id: 'alert_latency_001',
      alert_type: 'high_latency',
      service: 'payment-service',
      severity: 'medium',
      threshold: 5000,
      current_value: 12500,
      baseline_value: 250,
      trigger: 'p99_latency > threshold for 10 minutes',
      context: {
        window_start: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        window_end: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        affected_endpoints: ['/api/v1/payments'],
      },
    },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function bulkIndex(client: Client, index: string, documents: any[]): Promise<void> {
  if (documents.length === 0) {
    console.log(`  Skipping ${index} - no documents`);
    return;
  }

  const body = documents.flatMap((doc) => [{ index: { _index: index } }, doc]);

  const response = await client.bulk({ body, refresh: true });

  if (response.errors) {
    const errors = response.items?.filter((item) => item.index?.error);
    console.log(`  ⚠️  Indexed ${documents.length} documents to ${index} with ${errors?.length || 0} errors`);
  } else {
    console.log(`  ✅ Indexed ${documents.length} documents to ${index}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createIndexWithMapping(client: Client, index: string, properties: Record<string, any>): Promise<void> {
  const exists = await client.indices.exists({ index });
  if (exists) {
    console.log(`  Index ${index} already exists, deleting...`);
    await client.indices.delete({ index });
  }

  await client.indices.create({
    index,
    mappings: { properties },
  });
  console.log(`  Created index ${index} with mappings`);
}

async function main(): Promise<void> {
  console.log('🚀 Incident Response Agent - Data Generator\n');
  console.log('Connecting to Elasticsearch...\n');

  let client: Client;
  try {
    client = createClient();
    const info = await client.info();
    console.log(`✅ Connected to Elasticsearch ${info.version.number}\n`);
  } catch (error) {
    console.error('❌ Failed to connect to Elasticsearch');
    console.error(error);
    process.exit(1);
  }

  const baseTime = new Date();

  console.log('📁 Creating indices with mappings...\n');

  await createIndexWithMapping(client, 'logs-app', {
    '@timestamp': { type: 'date' },
    service: { type: 'keyword' },
    level: { type: 'keyword' },
    message: { type: 'text' },
    logger: { type: 'keyword' },
    trace_id: { type: 'keyword' },
    thread: { type: 'keyword' },
    environment: { type: 'keyword' },
    exception: {
      properties: {
        type: { type: 'keyword' },
        message: { type: 'text' },
        stacktrace: { type: 'text' },
      },
    },
    context: {
      properties: {
        user_id: { type: 'keyword' },
        request_id: { type: 'keyword' },
        payment_amount: { type: 'keyword' },
      },
    },
    host: {
      properties: {
        name: { type: 'keyword' },
        ip: { type: 'ip' },
      },
    },
  });

  await createIndexWithMapping(client, 'logs-access', {
    '@timestamp': { type: 'date' },
    service: { type: 'keyword' },
    method: { type: 'keyword' },
    path: { type: 'keyword' },
    status_code: { type: 'integer' },
    response_time_ms: { type: 'long' },
    request_size_bytes: { type: 'long' },
    response_size_bytes: { type: 'long' },
    client_ip: { type: 'ip' },
    user_agent: { type: 'text' },
    trace_id: { type: 'keyword' },
    user_id: { type: 'keyword' },
    host: { type: 'keyword' },
  });

  await createIndexWithMapping(client, 'traces', {
    '@timestamp': { type: 'date' },
    trace_id: { type: 'keyword' },
    span_id: { type: 'keyword' },
    parent_span_id: { type: 'keyword' },
    service: { type: 'keyword' },
    operation: { type: 'keyword' },
    duration_ms: { type: 'long' },
    status: { type: 'keyword' },
    error: {
      properties: {
        type: { type: 'keyword' },
        message: { type: 'text' },
      },
    },
    tags: {
      properties: {
        'http.status_code': { type: 'integer' },
        'http.method': { type: 'keyword' },
        user_id: { type: 'keyword' },
      },
    },
    dependencies: {
      type: 'nested',
      properties: {
        service: { type: 'keyword' },
        operation: { type: 'keyword' },
        duration_ms: { type: 'long' },
        status: { type: 'keyword' },
      },
    },
  });

  await createIndexWithMapping(client, 'deployments', {
    '@timestamp': { type: 'date' },
    service: { type: 'keyword' },
    version: { type: 'keyword' },
    previous_version: { type: 'keyword' },
    environment: { type: 'keyword' },
    deployed_by: { type: 'keyword' },
    deployment_id: { type: 'keyword' },
    commit: {
      properties: {
        hash: { type: 'keyword' },
        message: { type: 'text' },
        author: { type: 'keyword' },
        branch: { type: 'keyword' },
      },
    },
    changes: {
      type: 'nested',
      properties: {
        file: { type: 'keyword' },
        change_type: { type: 'keyword' },
      },
    },
    deployment_method: { type: 'keyword' },
    rollback_available: { type: 'boolean' },
    status: { type: 'keyword' },
  });

  await createIndexWithMapping(client, 'service-topology', {
    service: { type: 'keyword' },
    version: { type: 'keyword' },
    tier: { type: 'keyword' },
    team: { type: 'keyword' },
    dependencies: {
      properties: {
        upstream: { type: 'keyword' },
        downstream: { type: 'keyword' },
      },
    },
    runbook_url: { type: 'keyword' },
    oncall_team: { type: 'keyword' },
    slack_channel: { type: 'keyword' },
    criticality: { type: 'keyword' },
  });

  await createIndexWithMapping(client, 'metrics-system', {
    '@timestamp': { type: 'date' },
    service: { type: 'keyword' },
    host: { type: 'keyword' },
    cpu_percent: { type: 'float' },
    memory_used_mb: { type: 'long' },
    memory_total_mb: { type: 'long' },
    memory_percent: { type: 'float' },
    disk_io_read_mb: { type: 'float' },
    disk_io_write_mb: { type: 'float' },
    network_in_kb: { type: 'long' },
    network_out_kb: { type: 'long' },
    gc_pause_ms: { type: 'long' },
    thread_count: { type: 'integer' },
    request_rate: { type: 'float' },
    error_rate: { type: 'float' },
    latency_p50_ms: { type: 'long' },
    latency_p95_ms: { type: 'long' },
    latency_p99_ms: { type: 'long' },
  });

  await createIndexWithMapping(client, 'alerts', {
    '@timestamp': { type: 'date' },
    alert_id: { type: 'keyword' },
    alert_type: { type: 'keyword' },
    service: { type: 'keyword' },
    severity: { type: 'keyword' },
    threshold: { type: 'float' },
    current_value: { type: 'float' },
    baseline_value: { type: 'float' },
    trigger: { type: 'text' },
    context: {
      properties: {
        window_start: { type: 'date' },
        window_end: { type: 'date' },
        error_count: { type: 'long' },
        affected_endpoints: { type: 'keyword' },
      },
    },
  });

  console.log('\n📊 Generating and ingesting data...\n');

  console.log('1. Application Logs (with error spike in payment-service)...');
  const normalLogs = generateAppLogs(baseTime, 300);
  const spikeLogs = generateAppLogs(baseTime, 800, 'payment-service', 0.45);
  await bulkIndex(client, 'logs-app', [...normalLogs, ...spikeLogs]);

  console.log('\n2. Access Logs...');
  const normalAccess = generateAccessLogs(baseTime, 200);
  const spikeAccess = generateAccessLogs(baseTime, 400, 'payment-service', 0.35);
  await bulkIndex(client, 'logs-access', [...normalAccess, ...spikeAccess]);

  console.log('\n3. Distributed Traces...');
  const normalTraces = generateTraces(baseTime, 150);
  const spikeTraces = generateTraces(baseTime, 300, 'payment-service', 0.4);
  await bulkIndex(client, 'traces', [...normalTraces, ...spikeTraces]);

  console.log('\n4. Deployments...');
  await bulkIndex(client, 'deployments', generateDeployments());

  console.log('\n5. Service Topology...');
  await bulkIndex(client, 'service-topology', generateServiceTopology());

  console.log('\n6. System Metrics...');
  const normalMetrics = generateMetrics(baseTime, 40);
  const spikeMetrics = generateMetrics(baseTime, 30, 'payment-service');
  await bulkIndex(client, 'metrics-system', [...normalMetrics, ...spikeMetrics]);

  console.log('\n7. Alerts...');
  await bulkIndex(client, 'alerts', generateAlerts());

  console.log('\n\n📋 Data Summary\n');

  const indices = ['logs-app', 'logs-access', 'traces', 'deployments', 'service-topology', 'metrics-system', 'alerts'];

  for (const index of indices) {
    const count = await client.count({ index });
    console.log(`  ${index}: ${count.count} documents`);
  }

  console.log('\n✅ Data generation complete!');
  console.log('\n🎯 Simulated Incident: Error spike in payment-service');
  console.log('   - Error rate increased from 0.3% to ~18.5%');
  console.log('   - Primary error: SocketTimeoutException connecting to payment-gateway');
  console.log('   - Recent deployment: payment-service v2.4.1 deployed 2 hours ago');
  console.log('\n💡 Try asking the agent: "Investigate the error spike in payment-service"\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
