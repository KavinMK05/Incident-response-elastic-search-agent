import * as fs from 'fs';
import * as path from 'path';
import { generateAppLogs, generateTraces, generateDeployments, generateAlerts, AppLog, Trace, Deployment, Alert } from './shared';

const OUTPUT_DIR = path.resolve(__dirname, '../../data/csv');

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCSV(filename: string, headers: string[], rows: string[][]): void {
  const filePath = path.join(OUTPUT_DIR, filename);
  const content = [headers.join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n');
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ ${filename} (${rows.length} rows)`);
}

function flattenAppLog(log: AppLog): string[] {
  return [
    log['@timestamp'],
    log.service,
    log.level,
    log.message,
    log.logger,
    log.trace_id,
    log.environment,
    log.exception?.type ?? '',
    log.exception?.message ?? '',
    log.exception?.stacktrace ?? '',
  ];
}

function flattenTrace(trace: Trace): string[] {
  return [
    trace['@timestamp'],
    trace.trace_id,
    trace.span_id,
    trace.parent_span_id,
    trace.service,
    trace.operation,
    String(trace.duration_ms),
    trace.status,
    trace.error?.type ?? '',
    trace.error?.message ?? '',
  ];
}

function flattenDeployment(deployment: Deployment): string[] {
  return [
    deployment['@timestamp'],
    deployment.service,
    deployment.version,
    deployment.previous_version,
    deployment.environment,
    deployment.deployed_by,
    deployment.deployment_id,
    deployment.commit.hash,
    deployment.commit.message,
    deployment.commit.author,
    deployment.commit.branch,
    deployment.status,
  ];
}

function flattenAlert(alert: Alert): string[] {
  return [
    alert['@timestamp'],
    alert.alert_id,
    alert.alert_type,
    alert.service,
    alert.severity,
    String(alert.threshold),
    String(alert.current_value),
    String(alert.baseline_value),
    alert.trigger,
    alert.context.window_start,
    alert.context.window_end,
    String(alert.context.error_count),
  ];
}

function main(): void {
  console.log('🚀 Incident Response Agent - CSV Data Generator\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created directory: ${OUTPUT_DIR}\n`);
  }

  const baseTime = new Date();

  console.log('📊 Generating CSV files...\n');

  console.log('1. Application Logs (with error spike in payment-service)...');
  const normalLogs = generateAppLogs(baseTime, 200);
  const spikeLogs = generateAppLogs(baseTime, 500, 'payment-service', 0.45);
  const allLogs = [...normalLogs, ...spikeLogs];
  writeCSV('logs-app.csv', [
    'timestamp', 'service', 'level', 'message', 'logger', 'trace_id', 'environment',
    'exception_type', 'exception_message', 'exception_stacktrace'
  ], allLogs.map(flattenAppLog));

  console.log('\n2. Distributed Traces...');
  const normalTraces = generateTraces(baseTime, 100);
  const spikeTraces = generateTraces(baseTime, 200, 'payment-service', 0.4);
  const allTraces = [...normalTraces, ...spikeTraces];
  writeCSV('traces.csv', [
    'timestamp', 'trace_id', 'span_id', 'parent_span_id', 'service', 'operation',
    'duration_ms', 'status', 'error_type', 'error_message'
  ], allTraces.map(flattenTrace));

  console.log('\n3. Deployments...');
  const deployments = generateDeployments();
  writeCSV('deployments.csv', [
    'timestamp', 'service', 'version', 'previous_version', 'environment',
    'deployed_by', 'deployment_id', 'commit_hash', 'commit_message',
    'commit_author', 'commit_branch', 'status'
  ], deployments.map(flattenDeployment));

  console.log('\n4. Alerts...');
  const alerts = generateAlerts();
  writeCSV('alerts.csv', [
    'timestamp', 'alert_id', 'alert_type', 'service', 'severity',
    'threshold', 'current_value', 'baseline_value', 'trigger',
    'context_window_start', 'context_window_end', 'context_error_count'
  ], alerts.map(flattenAlert));

  console.log('\n\n📋 Summary\n');
  console.log(`  logs-app.csv: ${allLogs.length} rows`);
  console.log(`  traces.csv: ${allTraces.length} rows`);
  console.log(`  deployments.csv: ${deployments.length} rows`);
  console.log(`  alerts.csv: ${alerts.length} rows`);
  console.log(`\n✅ Complete! Files written to ${OUTPUT_DIR}`);
}

main();
