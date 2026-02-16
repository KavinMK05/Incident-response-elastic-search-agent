# Incident Response Agent

An AI-powered incident response agent built with Elastic Agent Builder that automates the investigation of production incidents, reducing response time from 30-60 minutes to under 2 minutes.

## Overview

When errors spike in production systems, engineers typically spend 30-60 minutes manually searching logs, correlating services, checking recent deployments, creating tickets, and notifying teams. This agent automates the entire workflow:

1. **Detects** error patterns and determines blast radius
2. **Correlates** affected services and traces failure paths
3. **Identifies** recent deployments that may have caused the issue
4. **Analyzes** root cause with supporting evidence
5. **Creates** Jira tickets with all findings and recommendations
6. **Notifies** the team via Slack

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ Error Spike │───▶│ Log Analysis │───▶│ Service     │───▶│ Deployment   │
│ Detection   │    │ & Correlation│    │ Mapping     │    │ Check        │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                                                │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐          │
│ Notify Team │◀───│ Create Ticket│◀───│ Root Cause  │◀─────────┘
│ (Slack)     │    │ (Jira)       │    │ Summary     │
└─────────────┘    └──────────────┘    └─────────────┘
```

## Project Structure

```
incident-response-agent/
├── src/
│   └── data-generator/    # TypeScript data generator for sample data
├── tools/                 # Custom ES|QL tool definitions
├── workflows/             # YAML workflow configurations
├── docs/                  # Documentation
├── .env.example           # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js 18+
- Elastic Cloud account with Agent Builder enabled
- (Optional) Jira and Slack for workflow integrations

## Setup

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Elastic Cloud credentials:

```bash
cp .env.example .env
```

Required environment variables:
```
ELASTIC_CLOUD_ID=your-cloud-id
ELASTIC_API_KEY=your-api-key
```

Get these from your [Elastic Cloud Console](https://cloud.elastic.co).

### 3. Generate Sample Data

```bash
npm run generate-data
```

This creates simulated production data including:
- Application logs with error spikes in `payment-service`
- Access logs with HTTP errors
- Distributed traces
- Deployment records
- Service topology
- System metrics
- Alert events

### 4. Configure Agent in Kibana

1. Navigate to **Kibana → Agents → Manage Tools**
2. Create the custom tools (see `tools/` directory)
3. Create a new agent with the system prompt (see `docs/system-prompt.md`)
4. Assign the tools to the agent

### 5. Configure Workflows (Optional)

For Jira and Slack integration:
1. Configure connectors in **Stack Management → Connectors**
2. Create workflows using the YAML files in `workflows/`
3. Expose workflows as agent tools

## Custom Tools

The agent uses these custom ES|QL tools:

| Tool | Purpose |
|------|---------|
| `detect_error_spike` | Identifies services with anomalous error rates |
| `fetch_error_logs` | Retrieves error log entries for analysis |
| `correlate_services` | Maps service dependencies and failure paths |
| `get_traces` | Fetches distributed traces for failed requests |
| `recent_deployments` | Lists recent deployments to affected services |
| `get_service_topology` | Gets service dependency information |
| `search_error_pattern` | Searches for specific error patterns |
| `get_metrics_anomaly` | Retrieves system metric anomalies |

## Usage

After setup, interact with the agent through Kibana's Agent Builder interface:

**Example prompts:**
- "Investigate the error spike in payment-service"
- "What caused the increase in 500 errors over the last hour?"
- "Check if any recent deployments are related to the current incident"

## Demo Scenario

The data generator creates a realistic incident scenario:

- **Service:** payment-service
- **Issue:** Error rate increased from 0.3% to ~18.5%
- **Root Cause:** Connection timeouts to external payment-gateway
- **Recent Change:** v2.4.1 deployed 2 hours ago (increased timeout from 10s to 30s)
- **Errors:** Primarily `SocketTimeoutException` and `ConnectionRefusedException`

## Hackathon Submission

This project was built for the [Elasticsearch Agent Builder Hackathon](https://elasticsearch.devpost.com/).

### Features Used
- Custom ES|QL tools for log queries and analysis
- Agent Builder system prompts for structured investigation
- Elastic Workflows for Jira ticket creation and Slack notifications
- MCP/A2A integration capabilities

### Challenges Solved
- Designing investigation phases that mirror real SRE workflows
- Balancing automation with human oversight through confidence levels
- Structuring output for both human readability and workflow consumption

## License

MIT License - see [LICENSE](LICENSE) file.

## Resources

- [Elastic Agent Builder Documentation](https://www.elastic.co/docs/solutions/search/elastic-agent-builder)
- [Elastic Workflows Documentation](https://www.elastic.co/docs/explore-analyze/workflows)
- [ES|QL Reference](https://www.elastic.co/docs/explore-analyze/query-filter/languages/esql)
- [Elasticsearch Labs](https://github.com/elastic/elasticsearch-labs)
