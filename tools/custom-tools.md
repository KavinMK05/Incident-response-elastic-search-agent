# Custom Tools Configuration

This document contains all the custom tool definitions for the Incident Response Agent.

## How to Create Tools in Kibana

1. Navigate to **Kibana → Agents → Manage Tools**
2. Click **New Tool**
3. Select tool type: **ES|QL** or **Index Search**
4. Fill in the fields as described below
5. Click **Save & Test** to validate
6. Repeat for each tool

---

## Tool 1: detect_error_spike

**Tool ID:** `detect_error_spike`  
**Display Name:** Detect Error Spike  
**Type:** ES|QL

**Description:**
Identifies services with error rates exceeding a threshold. Use this to detect which services are experiencing elevated error rates. Returns service name, error count, error rate percentage, and normal baseline rate.

**ES|QL Query:**
```sql
FROM logs-app
| WHERE @timestamp >= NOW() - ?time_window
| STATS 
    total_requests = COUNT(*),
    error_count = COUNT(CASE(level == "ERROR" OR level == "FATAL", 1))
    BY service
| EVAL error_rate = (error_count * 100.0) / total_requests
| WHERE error_count > ?min_error_count
| SORT error_count DESC
| LIMIT 20
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `time_window` | text | `1h` | Time window to analyze (e.g., 30m, 1h, 6h) |
| `min_error_count` | integer | `10` | Minimum error count to include in results |

---

## Tool 2: fetch_error_logs

**Tool ID:** `fetch_error_logs`  
**Display Name:** Fetch Error Logs  
**Type:** ES|QL

**Description:**
Retrieves error log entries for a specific service within a time window. Use this to get detailed error messages, stack traces, and context. Returns timestamp, level, message, exception type, and trace_id.

**ES|QL Query:**
```sql
FROM logs-app
| WHERE @timestamp >= NOW() - ?time_window
| WHERE service == ?service_name
| WHERE level IN ("ERROR", "FATAL")
| KEEP @timestamp, level, message, logger, trace_id, exception.type, exception.message, context
| SORT @timestamp DESC
| LIMIT ?limit
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `service_name` | text | `*` | Service name to filter (use * for all) |
| `time_window` | text | `30m` | Time window to search |
| `limit` | integer | `100` | Maximum number of logs to return |

---

## Tool 3: correlate_services

**Tool ID:** `correlate_services`  
**Display Name:** Correlate Services  
**Type:** ES|QL

**Description:**
Identifies services experiencing errors and maps the failure propagation through service dependencies. Use this to understand which services are affected and how errors spread. Returns service pairs with error counts.

**ES|QL Query:**
```sql
FROM traces
| WHERE @timestamp >= NOW() - ?time_window
| WHERE status == "error" OR error IS NOT NULL
| STATS error_count = COUNT(*) BY service
| SORT error_count DESC
| LIMIT 50
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `time_window` | text | `30m` | Time window to analyze |

---

## Tool 4: get_traces

**Tool ID:** `get_traces`  
**Display Name:** Get Traces  
**Type:** ES|QL

**Description:**
Retrieves distributed traces for failed requests. Use this to see the full request flow and identify where failures occurred. Returns trace_id, service, operation, duration, and error details.

**ES|QL Query:**
```sql
FROM traces
| WHERE @timestamp >= NOW() - ?time_window
| WHERE service == ?service_name
| WHERE status == "error" OR error IS NOT NULL
| STATS 
    occurrences = COUNT(*),
    avg_duration_ms = AVG(duration_ms),
    max_duration_ms = MAX(duration_ms)
    BY trace_id, service, operation, error.type, error.message
| SORT occurrences DESC
| LIMIT ?limit
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `service_name` | text | `*` | Service name to filter |
| `time_window` | text | `30m` | Time window to search |
| `limit` | integer | `50` | Maximum traces to return |

---

## Tool 5: recent_deployments

**Tool ID:** `recent_deployments`  
**Display Name:** Recent Deployments  
**Type:** ES|QL

**Description:**
Lists deployments to specified services within a time window. Use this to identify if recent changes may have caused the incident. Returns version, deployer, commit info, and timestamp.

**ES|QL Query:**
```sql
FROM deployments
| WHERE @timestamp >= NOW() - ?time_window
| WHERE service == ?service_name OR ?service_name == "*"
| KEEP @timestamp, service, version, previous_version, deployed_by, commit.hash, commit.message, commit.author, status
| SORT @timestamp DESC
| LIMIT 20
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `time_window` | text | `24h` | Time window to search (default 24 hours) |
| `service_name` | text | `*` | Service name to filter |

---

## Tool 6: get_service_topology

**Tool ID:** `get_service_topology`  
**Display Name:** Get Service Topology  
**Type:** Index Search

**Description:**
Retrieves service dependency information including upstream/downstream services, team ownership, runbook links, and on-call contacts. Use this to understand service relationships and escalation paths.

**Target Index Pattern:** `service-topology`

---

## Tool 7: search_error_pattern

**Tool ID:** `search_error_pattern`  
**Display Name:** Search Error Pattern  
**Type:** ES|QL

**Description:**
Searches for logs matching a specific error pattern or message. Use this to find all occurrences of a specific error type or message across services. Returns matching logs with service context.

**ES|QL Query:**
```sql
FROM logs-app
| WHERE @timestamp >= NOW() - ?time_window
| WHERE message LIKE CONCAT("*", ?pattern, "*")
  OR exception.type LIKE CONCAT("*", ?pattern, "*")
  OR exception.message LIKE CONCAT("*", ?pattern, "*")
| STATS occurrences = COUNT(*) BY service, level, exception.type
| EVAL sample_message = FIRST(message)
| SORT occurrences DESC
| LIMIT 50
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `pattern` | text | (required) | Error pattern to search for |
| `time_window` | text | `1h` | Time window to search |

---

## Tool 8: get_metrics_anomaly

**Tool ID:** `get_metrics_anomaly`  
**Display Name:** Get Metrics Anomaly  
**Type:** ES|QL

**Description:**
Retrieves system metrics (CPU, memory, latency) for a service to identify performance anomalies. Use this to correlate errors with system resource issues. Returns metric values with timestamps.

**ES|QL Query:**
```sql
FROM metrics-system
| WHERE @timestamp >= NOW() - ?time_window
| WHERE service == ?service_name OR ?service_name == "*"
| STATS 
    avg_cpu = AVG(cpu_percent),
    max_cpu = MAX(cpu_percent),
    avg_memory = AVG(memory_percent),
    max_memory = MAX(memory_percent),
    avg_latency_p95 = AVG(latency_p95_ms),
    max_latency_p95 = MAX(latency_p95_ms),
    avg_error_rate = AVG(error_rate),
    max_error_rate = MAX(error_rate)
| EVAL cpu_status = CASE(max_cpu > 90, "CRITICAL", max_cpu > 75, "WARNING", "OK")
| EVAL memory_status = CASE(max_memory > 90, "CRITICAL", max_memory > 75, "WARNING", "OK")
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `service_name` | text | `*` | Service name to analyze |
| `time_window` | text | `30m` | Time window to analyze |

---

## Assigning Tools to Agent

After creating all tools:

1. Go to **Kibana → Agents**
2. Click **New Agent**
3. Fill in:
   - **Agent ID:** `incident-response-agent`
   - **Display Name:** `Incident Response Agent`
   - **Description:** (see README.md)
4. Paste the **System Prompt** from `docs/system-prompt.md`
5. In **Available Tools**, select all 8 tools
6. Click **Save**
