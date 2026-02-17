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
];

const ERROR_TYPES = [
  { type: 'SocketTimeoutException', message: 'Connection to payment-gateway timed out after 30s' },
  { type: 'ConnectionRefusedException', message: 'Connection refused to payment-gateway' },
  { type: 'PaymentDeclinedException', message: 'Payment was declined by payment gateway: insufficient funds' },
  { type: 'ServiceUnavailableException', message: 'External service payment-gateway is unavailable' },
];

const INFO_MESSAGES = [
  'Request processed successfully',
  'Order created',
  'Payment initiated',
  'User session started',
  'Health check passed',
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
      return new Client({ node, auth: { apiKey } });
    }
    if (username && password) {
      return new Client({ node, auth: { username, password } });
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
        error_count: 1847,
      },
    },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function bulkIndex(client: Client, index: string, documents: any[]): Promise<void> {
  if (documents.length === 0) return;

  const body = documents.flatMap((doc) => [{ index: { _index: index } }, doc]);
  const response = await client.bulk({ body, refresh: true });

  if (response.errors) {
    console.log(`  ⚠️  Indexed ${documents.length} to ${index} with errors`);
  } else {
    console.log(`  ✅ Indexed ${documents.length} documents to ${index}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createIndex(client: Client, index: string, properties: Record<string, any>): Promise<void> {
  const exists = await client.indices.exists({ index });
  if (exists) {
    await client.indices.delete({ index });
  }
  await client.indices.create({ index, mappings: { properties } });
  console.log(`  Created index: ${index}`);
}

async function main(): Promise<void> {
  console.log('🚀 Incident Response Agent - Data Generator\n');

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

  console.log('📁 Creating indices...\n');

  await createIndex(client, 'logs-app', {
    '@timestamp': { type: 'date' },
    service: { type: 'keyword' },
    level: { type: 'keyword' },
    message: { type: 'text' },
    logger: { type: 'keyword' },
    trace_id: { type: 'keyword' },
    environment: { type: 'keyword' },
    exception: {
      properties: {
        type: { type: 'keyword' },
        message: { type: 'text' },
        stacktrace: { type: 'text' },
      },
    },
  });

  await createIndex(client, 'traces', {
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
  });

  await createIndex(client, 'deployments', {
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
    status: { type: 'keyword' },
  });

  await createIndex(client, 'alerts', {
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
      },
    },
  });

  console.log('\n📊 Generating data...\n');

  console.log('1. Application Logs (with error spike in payment-service)...');
  const normalLogs = generateAppLogs(baseTime, 200);
  const spikeLogs = generateAppLogs(baseTime, 500, 'payment-service', 0.45);
  await bulkIndex(client, 'logs-app', [...normalLogs, ...spikeLogs]);

  console.log('\n2. Distributed Traces...');
  const normalTraces = generateTraces(baseTime, 100);
  const spikeTraces = generateTraces(baseTime, 200, 'payment-service', 0.4);
  await bulkIndex(client, 'traces', [...normalTraces, ...spikeTraces]);

  console.log('\n3. Deployments...');
  await bulkIndex(client, 'deployments', generateDeployments());

  console.log('\n4. Alerts...');
  await bulkIndex(client, 'alerts', generateAlerts());

  console.log('\n\n📋 Summary\n');

  for (const index of ['logs-app', 'traces', 'deployments', 'alerts']) {
    const count = await client.count({ index });
    console.log(`  ${index}: ${count.count} documents`);
  }

  console.log('\n✅ Complete! Simulated incident: Error spike in payment-service');
  console.log('💡 Try: "Investigate the error spike in payment-service"\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
