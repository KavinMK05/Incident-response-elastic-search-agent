# IncidentCopAI Agent

An AI-powered incident response agent built with **Elastic Agent Builder** that automates production incident investigation, reducing response time from 30-60 minutes to under 2 minutes.

## What It Does

When errors spike in production, the agent:

1. **Detects** error patterns and affected services
2. **Analyzes** error logs and stack traces
3. **Traces** failure propagation across services
4. **Identifies** recent deployments that may have caused the issue
5. **Generates** incident reports with root cause and recommendations

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Elasticsearch

Copy `.env.example` to `.env` and add your Elastic Cloud credentials:

```
ELASTIC_CLOUD_ID=your-cloud-id
ELASTIC_API_KEY=your-api-key
```

Get these from [Elastic Cloud Console](https://cloud.elastic.co).

### 3. Generate Sample Data

```bash
npm run generate-data
```

This creates:
- **logs-app** - Application logs with error spike in `payment-service`
- **traces** - Distributed traces showing failure paths
- **deployments** - Recent deployment records
- **alerts** - Error spike alert

### 4. Configure Agent in Kibana

1. Go to **Kibana → Agents → Manage Tools**
2. Create tools from `tools/custom-tools.md`
3. Create new agent with prompt from `docs/system-prompt.md`
4. Assign the tools

### 5. Test

Ask the agent: *"Investigate the error spike in payment-service"*

## Simulated Incident

The data generator creates a realistic scenario:

| Attribute | Value |
|-----------|-------|
| Service | payment-service |
| Error Rate | 0.3% → 18.5% |
| Primary Error | SocketTimeoutException |
| Root Cause | Connection timeout to payment-gateway |
| Recent Deployment | v2.4.1 (2 hours ago) |

## Project Structure

```
├── src/data-generator/   # TypeScript data generator
├── tools/                # Tool definitions
├── workflows/            # Jira/Slack workflows
├── docs/                 # Documentation
└── README.md
```

## Custom Tools

| Tool | Purpose |
|------|---------|
| `detect_error_spike` | Find services with elevated errors |
| `fetch_error_logs` | Get error details and stack traces |
| `get_traces` | Trace failure propagation |
| `recent_deployments` | Check recent changes |
| `search_errors` | Search by error pattern |

## Hackathon

Built for the [Elasticsearch Agent Builder Hackathon](https://elasticsearch.devpost.com/).

## License

MIT
