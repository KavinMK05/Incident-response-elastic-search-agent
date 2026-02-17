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
Identifies services with elevated error rates. Returns service name, error count, and error rate.

**ES|QL Query:**
```sql
FROM logs-app
| WHERE @timestamp >= NOW() - ?time_window
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
| Name | Type | Default |
|------|------|---------|
| `time_window` | text | `1h` |
| `min_errors` | integer | `5` |

---

## Tool 2: fetch_error_logs

**Tool ID:** `fetch_error_logs`  
**Type:** ES|QL

**Description:**
Retrieves error logs for a specific service. Returns timestamp, message, and exception details.

**ES|QL Query:**
```sql
FROM logs-app
| WHERE @timestamp >= NOW() - ?time_window
| WHERE service == ?service
| WHERE level IN ("ERROR", "FATAL")
| KEEP @timestamp, level, message, trace_id, exception.type, exception.message
| SORT @timestamp DESC
| LIMIT ?limit
```

**Parameters:**
| Name | Type | Default |
|------|------|---------|
| `service` | text | `payment-service` |
| `time_window` | text | `30m` |
| `limit` | integer | `50` |

---

## Tool 3: get_traces

**Tool ID:** `get_traces`  
**Type:** ES|QL

**Description:**
Fetches distributed traces for failed requests. Shows error propagation across services.

**ES|QL Query:**
```sql
FROM traces
| WHERE @timestamp >= NOW() - ?time_window
| WHERE service == ?service
| WHERE status == "error"
| STATS count = COUNT(*) BY trace_id, service, operation, error.type, error.message
| SORT count DESC
| LIMIT 20
```

**Parameters:**
| Name | Type | Default |
|------|------|---------|
| `service` | text | `payment-service` |
| `time_window` | text | `30m` |

---

## Tool 4: recent_deployments

**Tool ID:** `recent_deployments`  
**Type:** ES|QL

**Description:**
Lists recent deployments to identify potential causes of incidents.

**ES|QL Query:**
```sql
FROM deployments
| WHERE @timestamp >= NOW() - ?time_window
| WHERE service == ?service OR ?service == "*"
| KEEP @timestamp, service, version, previous_version, deployed_by, commit.message
| SORT @timestamp DESC
| LIMIT 10
```

**Parameters:**
| Name | Type | Default |
|------|------|---------|
| `time_window` | text | `24h` |
| `service` | text | `*` |

---

## Tool 5: search_errors

**Tool ID:** `search_errors`  
**Type:** ES|QL

**Description:**
Searches for specific error patterns across all services.

**ES|QL Query:**
```sql
FROM logs-app
| WHERE @timestamp >= NOW() - ?time_window
| WHERE message LIKE CONCAT("*", ?pattern, "*")
   OR exception.type LIKE CONCAT("*", ?pattern, "*")
| STATS count = COUNT(*) BY service, exception.type
| SORT count DESC
| LIMIT 20
```

**Parameters:**
| Name | Type | Default |
|------|------|---------|
| `pattern` | text | `timeout` |
| `time_window` | text | `1h` |

---

## Assign Tools to Agent

1. Go to **Kibana → Agents → New Agent**
2. Set Agent ID: `incident-response-agent`
3. Paste system prompt from `docs/system-prompt.md`
4. Select all 5 tools
5. Save
