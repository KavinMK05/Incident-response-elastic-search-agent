# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ELASTIC CLOUD                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     ELASTICSEARCH INDICES                           │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌─────────┐ │    │
│  │  │ logs-app │ │ traces   │ │deployments│ │service-    │ │ metrics │ │    │
│  │  │          │ │          │ │          │ │topology    │ │-system  │ │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘ └─────────┘ │    │
│  │  ┌──────────┐ ┌──────────┐                                         │    │
│  │  │logs-     │ │ alerts   │                                         │    │
│  │  │access    │ │          │                                         │    │
│  │  └──────────┘ └──────────┘                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     AGENT BUILDER                                    │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │              INCIDENT RESPONSE AGENT                           │  │    │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │  │    │
│  │  │  │                   CUSTOM TOOLS                          │  │  │    │
│  │  │  │  • detect_error_spike    • fetch_error_logs             │  │  │    │
│  │  │  │  • correlate_services    • get_traces                   │  │  │    │
│  │  │  │  • recent_deployments    • get_service_topology         │  │  │    │
│  │  │  │  • search_error_pattern  • get_metrics_anomaly          │  │  │    │
│  │  │  └─────────────────────────────────────────────────────────┘  │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     WORKFLOWS                                        │    │
│  │  ┌───────────────────┐              ┌───────────────────┐          │    │
│  │  │ Jira Ticket       │              │ Slack Notification│          │    │
│  │  │ Creation          │              │                   │          │    │
│  │  └───────────────────┘              └───────────────────┘          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────┐
        │              EXTERNAL INTEGRATIONS             │
        │  ┌───────────┐              ┌───────────────┐  │
        │  │   JIRA    │              │    SLACK      │  │
        │  │           │              │               │  │
        │  └───────────┘              └───────────────┘  │
        └───────────────────────────────────────────────┘
```

## Investigation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INCIDENT INVESTIGATION FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

User Input: "Investigate error spike in payment-service"
         │
         ▼
┌─────────────────┐
│  PHASE 1        │    ┌────────────────────────────────────┐
│  Detection      │───▶│ Tool: detect_error_spike           │
│  & Scope        │    │ Output: Error count, affected svcs │
└─────────────────┘    └────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  PHASE 2        │    ┌────────────────────────────────────┐
│  Error Analysis │───▶│ Tool: fetch_error_logs             │
│                 │    │ Output: Top errors, stack traces   │
└─────────────────┘    └────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  PHASE 3        │    ┌────────────────────────────────────┐
│  Service        │───▶│ Tool: correlate_services, get_traces│
│  Correlation    │    │ Output: Failure propagation path   │
└─────────────────┘    └────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  PHASE 4        │    ┌────────────────────────────────────┐
│  Deployment     │───▶│ Tool: recent_deployments           │
│  Context        │    │ Output: Suspicious deployments     │
└─────────────────┘    └────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  PHASE 5        │    ┌────────────────────────────────────┐
│  Root Cause     │───▶│ Synthesize all findings            │
│  Hypothesis     │    │ Output: Root cause + confidence    │
└─────────────────┘    └────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  PHASE 6        │    ┌────────────────────────────────────┐
│  Actions        │───▶│ Workflow: create_jira_ticket       │
│                 │    │ Workflow: notify_slack             │
└─────────────────┘    └────────────────────────────────────┘
         │
         ▼
    Structured Incident Report (JSON)
```

## Data Model

### Indices

| Index | Description | Key Fields |
|-------|-------------|------------|
| `logs-app` | Application logs | @timestamp, service, level, message, exception |
| `logs-access` | HTTP access logs | @timestamp, service, status_code, response_time_ms |
| `traces` | Distributed traces | trace_id, service, duration_ms, status, error |
| `deployments` | Deployment records | service, version, deployed_by, commit |
| `service-topology` | Service dependencies | service, dependencies (upstream/downstream) |
| `metrics-system` | System metrics | service, cpu_percent, error_rate, latency_p99_ms |
| `alerts` | Alert events | alert_type, service, severity, threshold |

### Simulated Incident

The data generator creates a realistic incident scenario:

```
Service: payment-service
Issue: Error rate spike from 0.3% to 18.5%
Root Cause: External payment-gateway timeouts
Recent Deployment: v2.4.1 (2 hours ago)
  - Changed timeout from 10s to 30s
Primary Errors:
  - SocketTimeoutException (1,847 occurrences)
  - ConnectionRefusedException (523 occurrences)
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| AI Agent | Elastic Agent Builder |
| Query Language | ES|QL |
| Data Store | Elasticsearch |
| Automation | Elastic Workflows |
| Integrations | Jira, Slack (via connectors) |
| Data Generator | TypeScript + Node.js |
