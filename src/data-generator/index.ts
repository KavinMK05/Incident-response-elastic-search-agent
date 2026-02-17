import { Client } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateAppLogs, generateTraces, generateDeployments, generateAlerts } from './shared';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
