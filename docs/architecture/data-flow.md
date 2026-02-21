# Fluxo de Dados — Disputatio Multi-ISP

## 1. Fluxo de Upload de Vídeo

O browser do usuário faz o upload diretamente no MinIO do ISP escolhido. O gateway nunca recebe o payload de vídeo.

```
Browser                 Disputatio App           Gateway                  ISP-X MinIO
   │                        │                       │                         │
   │── POST /debates/new ──►│                        │                         │
   │                        │── POST /api/upload ──►│                         │
   │                        │     { contentType }    │                         │
   │                        │                        │ 1. Consulta ISPs ativos │
   │                        │                        │ 2. Seleciona ISP com    │
   │                        │                        │    mais espaço livre    │
   │                        │                        │ 3. Gera presigned URL   │
   │                        │                        │    via SDK MinIO ISP-X  │
   │                        │◄── { uploadUrl,        │                         │
   │                        │      fileKey,           │                         │
   │                        │      resolveUrl } ─────│                         │
   │◄── retorna uploadUrl ──│                        │                         │
   │                        │                        │                         │
   │── PUT {uploadUrl} ─────────────────────────────────────────────────────►│
   │     [payload de vídeo — direto para o ISP, gateway não vê]              │
   │◄─────────────────────────────────────────── HTTP 200 ────────────────────│
   │                        │                        │                         │
   │── POST /debates ──────►│                        │                         │
   │    { fileKey,          │── Salva no Prisma ─────►                         │
   │      title, ... }      │   videoUrl = resolveUrl│                         │
   │◄── debate criado ──────│                        │                         │
```

### Decisão de ISP para Upload

```
Critério       Peso  Descrição
─────────────  ────  ────────────────────────────────────
disk_free_gb   60%   ISP com mais espaço tem prioridade
health_status  30%   Somente 'healthy' são elegíveis
weight config  10%   Peso manual configurável no painel
```

---

## 2. Fluxo de Download / Streaming

O gateway faz apenas um redirect HTTP 302 — o vídeo nunca passa por ele.

```
Browser (Player)         Gateway                  ISP-X MinIO
   │                        │                         │
   │── GET /resolve/{key} ─►│                         │
   │                        │ 1. Busca video_locations │
   │                        │    WHERE video_id = key  │
   │                        │ 2. Filtra ISPs healthy   │
   │                        │ 3. Round-robin ponderado │
   │                        │    por weight            │
   │◄── HTTP 302 ───────────│                         │
   │    Location: http://   │                         │
   │    {isp-endpoint}/     │                         │
   │    {bucket}/{key}      │                         │
   │                        │                         │
   │── GET http://isp:9000/disputatio-videos/{key} ──►│
   │◄── Video Stream ────────────────────────────────│
```

### Cenário de Fallback

```
ISP-1 offline   ISP-2 healthy   ISP-3 degraded
     │                │                │
     ✗          resolve escolhe       ⚠️ (menor prioridade)
                  ISP-2 → 302
```

Se TODOS os ISPs que têm o vídeo estiverem offline:
```
HTTP 503 Service Unavailable
{
  "error": "video_unavailable",
  "message": "Vídeo temporariamente indisponível. Tente novamente em instantes.",
  "retry_after": 30
}
```

---

## 3. Fluxo de Health Check

O `node-agent` de cada ISP envia heartbeat ativo para o gateway. O gateway também faz verificações passivas.

```
                    ATIVO (push, a cada 30s)
ISP node-agent ──► POST /internal/heartbeat/{isp_token}
{
  "disk_used_gb": 120.5,
  "disk_total_gb": 500,
  "bandwidth_out_today_gb": 34.2,
  "bandwidth_local_today_gb": 5.1,  // estimativa tráfego intra-ISP
  "minio_status": "ok",
  "latency_ms": 12
}

                    PASSIVO (pull, a cada 60s pelo gateway)
Gateway ──► GET http://{isp_endpoint}/minio/health/live
            Se timeout(5s) → marca como 'degraded'
            Se 3x consecutive → marca como 'offline'
```

### Transições de Estado do ISP

```
unknown ──► healthy ──► degraded ──► offline
                ▲           │           │
                └───────────┘           │
                  (recovery)            │
                ▲                       │
                └───────────────────────┘
                  (recovery após 3 checks OK)
```

---

## 4. Fluxo de Replicação de Vídeos Quentes

Job em background no gateway, executado a cada 5 minutos.

```
ReplicationWorker                  Gateway DB              ISP-Origem     ISP-Destino
       │                               │                        │               │
       │── SELECT videos com           │                        │               │
       │   view_count >= threshold ───►│                        │               │
       │   nas últimas N horas         │                        │               │
       │◄── lista de fileKeys ─────────│                        │               │
       │                               │                        │               │
  Para cada fileKey:                   │                        │               │
       │── SELECT video_locations ─────►                        │               │
       │◄── ISPs que já têm o vídeo ───│                        │               │
       │                               │                        │               │
       │── SELECT ISPs healthy que ────►                        │               │
       │   NÃO têm o vídeo             │                        │               │
       │◄── ISPs alvo ─────────────────│                        │               │
       │                               │                        │               │
  Para cada ISP alvo:                  │                        │               │
       │── POST /command ao            │                        │               │
       │   node-agent do ISP destino ──────────────────────────────────────────►│
       │   {                           │                        │               │
       │     action: "replicate",      │                        │               │
       │     sourceEndpoint: ...,      │                        │               │
       │     fileKey: ...              │                        │               │
       │   }                           │                        │               │
       │                               │                        │               │
       │                               │            node-agent ─►── mc cp ─────►│
       │                               │                        │  (ISP-Origem)  │
       │◄── { status: "ok" } ──────────────────────────────────────────────────│
       │── INSERT video_locations ─────►                        │               │
       │   (fileKey, isp_destino_id,   │                        │               │
       │    replicated_at: now())       │                        │               │
```

> **Replicação Direta ISP→ISP**: O node-agent do ISP destino puxa o vídeo diretamente do ISP origem usando `mc cp` (MinIO Client). O gateway **não toca o payload** — apenas coordena quem replica de quem.

---

## 5. Métricas de Banda — Como são Calculadas

```
Banda Total Reportada pelo ISP (MinIO Metrics)
       │
       ├── Banda "local" estimada (IPs do mesmo range do ISP)
       │          └── Desconto configurável no painel
       │
       └── Banda "externa" = Total - Local
                  └── Exibida nos gráficos do painel
```

O MinIO expõe métricas Prometheus em `/minio/v2/metrics/cluster`. O `node-agent` coleta:
- `minio_s3_traffic_sent_bytes` — bytes enviados (downloads)
- `minio_s3_traffic_received_bytes` — bytes recebidos (uploads)

```
Banda Externa = traffic_sent - estimated_local_traffic

estimated_local_traffic = requests de IPs em:
  - [isp.ipv4]/24 (por padrão, configurável)
  - [isp.ipv6]/48 (por padrão, configurável)
```
