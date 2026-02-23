# Custom Tools Configuration

Minimum required tools for the demo.

## How to Create Tools in Kibana

1. Navigate to **Kibana → Agents → Manage Tools**
2. Click **New Tool**
3. Select type: **ES|QL**
4. Fill in the fields below
5. Click **Save & Test**

---

## Tool 1: detect_error_spike

**Tool ID:** `detect_error_spike`  
**Type:** ES|QL

**Description:**
Identifies services experiencing elevated error rates within a specified time window. Use this tool to detect which services have error spikes during an incident, calculate error rates per service, and prioritize investigation by error count and severity. Returns: service name, total request count, error count, and error rate percentage. Best practice: Start investigations with this tool to identify affected services, then drill down with fetch_error_logs and get_traces.

**ES|QL Query:**
```sql
FROM logs-app
| WHERE TRANGE(1h)
| STATS 
    total = COUNT(*),
    errors = COUNT(CASE(level == "ERROR" OR level == "FATAL", 1))
    BY service
| EVAL error_rate = (errors * 100.0) / total
| WHERE errors > ?min_errors
| SORT errors DESC
| LIMIT 10
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `min_errors` | integer | `5` | Minimum number of errors required to include a service in results. Filters out services with negligible error counts to reduce noise. Increase this value for high-traffic services where occasional errors are normal, decrease for low-traffic services where every error matters. Example: Use `10` for services with 1000+ requests/minute, use `2` for services with <100 requests/minute. |

---

## Tool 2: fetch_error_logs

**Tool ID:** `fetch_error_logs`  
**Type:** ES|QL

**Description:**
Retrieves detailed error log entries for a specific service, including exception types, messages, and stack traces. Use this tool to examine specific error messages, identify exception types causing failures, extract trace IDs for distributed trace correlation, and review stack traces for debugging context. Returns: timestamp, log level, error message, trace ID, exception type, and exception message. Best practice: Call after detect_error_spike to investigate the root cause of errors in affected services.

**ES|QL Query:**
```sql
FROM logs-app
| WHERE TRANGE(30m)
| WHERE service == ?service
| WHERE level IN ("ERROR", "FATAL")
| KEEP @timestamp, level, message, trace_id, exception.type, exception.message
| SORT @timestamp DESC
| LIMIT ?limit
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `service` | text | `payment-service` | Name of the service to fetch error logs for. Must match the `service` field exactly as stored in Elasticsearch. Use values returned from detect_error_spike results to ensure accuracy. Common values: `payment-service`, `checkout-service`, `user-service`, `inventory-service`, `notification-service`. Case-sensitive. |
| `limit` | integer | `50` | Maximum number of error log entries to return. Controls the size of the result set for readability and performance. Use lower values (10-20) for quick summaries during triage, medium values (50-100) for standard investigation, and higher values (200-500) for detailed forensic analysis when you need complete error context. |

---

## Tool 3: get_traces

**Tool ID:** `get_traces`  
**Type:** ES|QL

**Description:**
Fetches distributed traces showing how errors propagate across services in a microservices architecture. Use this tool to understand failure paths across service boundaries, identify which operations are failing, correlate errors with specific trace IDs, and measure request duration and latency impact. Returns: trace ID, service, operation, error type, error message, and occurrence count. Best practice: Use trace IDs from fetch_error_logs to follow request flows and identify upstream or downstream failures.

**ES|QL Query:**
```sql
FROM traces
| WHERE TRANGE(30m)
| WHERE service == ?service
| WHERE status == "error"
| STATS count = COUNT(*) BY trace_id, service, operation, error.type, error.message
| SORT count DESC
| LIMIT 20
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `service` | text | `payment-service` | Name of the service to fetch distributed traces for. Returns traces where this service has errors, helping identify failure propagation patterns. Must match the exact service name in the traces index. Use the same service name from detect_error_spike and fetch_error_logs for consistent correlation. Enables tracing upstream (calling services) and downstream (called services) dependencies. |

---

## Tool 4: recent_deployments

**Tool ID:** `recent_deployments`  
**Type:** ES|QL

**Description:**
Lists recent deployment records to correlate incidents with code or configuration changes. Use this tool to identify deployments that may have caused or contributed to incidents, review commit messages for context on what changed, find deployment timestamps to correlate with error spike timing, and contact deployers for additional context. Returns: timestamp, service name, version, previous version, deployer email, and commit message. Best practice: Check deployments within the time window before an error spike to establish causation. A deployment 1-2 hours before a spike is a strong correlation signal.

**ES|QL Query:**
```sql
FROM deployments
| WHERE TRANGE(24h)
| WHERE service == ?service OR ?service == "*"
| KEEP @timestamp, service, version, previous_version, deployed_by, commit.message
| SORT @timestamp DESC
| LIMIT 10
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `service` | text | `*` | Service name to filter deployments. Use `*` to return all services (useful when investigating cross-service incidents), or specify an exact service name for targeted results. When correlating with error spikes, use the affected service name to find deployments that may have caused the issue. The query includes both exact match and wildcard results. |

---

## Tool 5: search_errors

**Tool ID:** `search_errors`  
**Type:** ES|QL

**Description:**
Searches for specific error patterns across all services using wildcard matching on messages and exception types. Use this tool to find all occurrences of a known error type across services, investigate widespread issues affecting multiple services, search for specific exception types (e.g., timeout, refused, memory), and track the spread of an error pattern over time. Returns: service name, exception type, and occurrence count, sorted by frequency. Best practice: Use when you have a hypothesis about the error type (from logs or alerts) and want to find all affected services.

**ES|QL Query:**
```sql
FROM logs-app
| WHERE TRANGE(1h)
| WHERE message LIKE CONCAT("%", ?pattern, "%") OR exception.type LIKE CONCAT("%", ?pattern, "%")
| STATS count = COUNT(*) BY service, exception.type
| SORT count DESC
| LIMIT 20
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `pattern` | text | `timeout` | Search pattern to match against error messages and exception types using SQL LIKE wildcard matching. The pattern is automatically wrapped with `%` wildcards to match anywhere in the text. Examples: `timeout` matches "Connection timeout" and "SocketTimeoutException"; `refused` matches "Connection refused"; `OutOfMemory` matches "OutOfMemoryError". Case-sensitive matching - use common error term variations. Partial matches are supported, e.g., `Socket` matches both "SocketTimeout" and "SocketException". |

---

## Assign Tools to Agent

1. Go to **Kibana → Agents → New Agent**
2. Set Agent ID: `incident-response-agent`
3. Paste system prompt from `docs/system-prompt.md`
4. Select all 5 tools
5. Save

---

## TRANGE Time Reference

The `TRANGE()` function filters data based on the `@timestamp` field. Here are common time values:

| Duration | TRANGE Syntax | Use Case |
|----------|---------------|----------|
| 15 minutes | `TRANGE(15m)` | Active incident investigation |
| 30 minutes | `TRANGE(30m)` | Standard error log analysis |
| 1 hour | `TRANGE(1h)` | Error spike detection, pattern search |
| 6 hours | `TRANGE(6h)` | Extended incident timeline |
| 24 hours | `TRANGE(24h)` | Deployment correlation |
| 7 days | `TRANGE(7d)` | Weekly trend analysis |

---

## Parameter Summary

| Tool | Parameter | Type | Default | Required |
|------|-----------|------|---------|----------|
| detect_error_spike | `min_errors` | integer | `5` | Yes |
| fetch_error_logs | `service` | text | `payment-service` | Yes |
| fetch_error_logs | `limit` | integer | `50` | Yes |
| get_traces | `service` | text | `payment-service` | Yes |
| recent_deployments | `service` | text | `*` | Yes |
| search_errors | `pattern` | text | `timeout` | Yes |

---

## Notes

1. **TRANGE uses hardcoded timespan literals** - ES|QL does not support parameterized timespan values, so time windows are built into the queries
2. **SQL LIKE wildcards** - The `search_errors` tool uses `%` for wildcards, not `*`
3. **Service names are case-sensitive** - Ensure exact matching with indexed values
4. **All tools filter by `@timestamp`** - Data must have a properly indexed timestamp field
