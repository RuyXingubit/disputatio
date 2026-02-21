# Arquitetura Multi-ISP Gateway — Disputatio

## Visão Geral

O **Disputatio Gateway** é um serviço leve responsável por orquestrar o armazenamento e a entrega de vídeos distribuídos entre múltiplos provedores de internet (ISPs) brasileiros. O princípio central é que o gateway **nunca carrega o payload de vídeo** — ele atua como um roteador de intenções, emitindo URLs assinadas (presigned URLs) que fazem o browser do usuário se comunicar diretamente com o MinIO de cada ISP.

---

## Diagrama de Componentes

```
┌──────────────────────────────────────────────────────────────┐
│                        USUÁRIO (Browser)                     │
└────────────────┬─────────────────────────┬───────────────────┘
                 │ 1. POST /upload-intent   │ 4. GET /resolve/:id
                 │                         │
┌────────────────▼─────────────────────────▼───────────────────┐
│                    DISPUTATIO GATEWAY                        │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│  │  ISP Registry │  │  Health Check │  │  Hot Replication │ │
│  │  (Postgres)   │  │  (periódico)  │  │  Worker (bg job) │ │
│  └───────────────┘  └───────────────┘  └──────────────────┘ │
│  • Seleciona ISP disponível e com espaço                     │
│  • Retorna presigned URL do MinIO do ISP escolhido           │
│  • Em /resolve, redireciona 302 pro ISP mais saudável        │
└──────────┬──────────────────┬────────────┬────────────┬──────┘
           │                  │            │            │
     ┌─────▼────┐       ┌─────▼────┐  ┌───▼────┐  ┌───▼────┐
     │ ISP-1    │       │ ISP-2    │  │ ISP-3  │  │ ISP-N  │
     │ MinIO    │       │ MinIO    │  │ MinIO  │  │ MinIO  │
     │ Proxmox  │       │ Proxmox  │  │Proxmox │  │Proxmox │
     └──────────┘       └──────────┘  └────────┘  └────────┘
              (quantidade ilimitada de ISPs parceiros)
```

---

## Componentes Principais

### 1. Disputatio Gateway (API)

Serviço stateless rodando na VM atual (expansível para os ISPs na v2). Responsável por:

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/upload-intent` | POST | Retorna presigned URL de upload para o ISP selecionado |
| `/api/resolve/:videoId` | GET | Redireciona (302) o browser para a URL de streaming do ISP mais saudável |
| `/api/health` | GET | Status interno do gateway |
| `/api/admin/isps` | GET/POST | Listar e gerenciar ISPs cadastrados |
| `/api/admin/config` | GET/PUT | Configurar thresholds de replicação e pesos de roteamento |

### 2. ISP Registry (Banco de Dados)

Tabela `isps` no PostgreSQL com os dados de cada provedor:

```sql
CREATE TABLE isps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,       -- "Provedor Alfa Telecom"
  slug         VARCHAR(100) UNIQUE NOT NULL, -- "alfa-telecom"
  minio_endpoint VARCHAR(512) NOT NULL,     -- "http://45.12.34.56:9000"
  minio_access_key VARCHAR(255) NOT NULL,
  minio_secret_key VARCHAR(255) NOT NULL,
  minio_bucket VARCHAR(255) NOT NULL,
  ipv4         INET,
  ipv6         INET,
  region       VARCHAR(100),                -- "SP", "RJ", "RS"
  is_active    BOOLEAN DEFAULT false,       -- aprovado pelo admin
  weight       INT DEFAULT 100,            -- peso para roteamento (100 = normal)
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR(20) DEFAULT 'unknown', -- 'healthy', 'degraded', 'offline'
  disk_used_gb DECIMAL,
  disk_total_gb DECIMAL,
  bandwidth_out_today_gb DECIMAL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE video_locations (
  video_id     VARCHAR(255) NOT NULL,        -- fileKey do vídeo
  isp_id       UUID REFERENCES isps(id),
  is_primary   BOOLEAN DEFAULT false,        -- ISP de upload original
  replicated_at TIMESTAMPTZ,
  PRIMARY KEY (video_id, isp_id)
);

CREATE TABLE replication_config (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);
-- Exemplos:
-- ('hot_video_threshold_views', '100')
-- ('hot_video_window_hours', '24')
-- ('replication_enabled', 'true')
```

### 3. Health Check Service

Job periódico (a cada 30s) que verifica cada ISP ativo:
- Conectividade no endpoint MinIO
- Espaço em disco disponível (via MinIO Admin API)
- Latência de resposta
- Atualiza `health_status`, `disk_used_gb`, `bandwidth_out_today_gb`

### 4. Hot Replication Worker

Job em background (a cada 5 minutos) que:
1. Busca vídeos com `view_count >= threshold` nas últimas `window_hours`
2. Verifica em quais ISPs o vídeo já existe (`video_locations`)
3. Para ISPs saudáveis onde o vídeo ainda não existe, inicia replicação via `mc mirror` ou `S3 CopyObject`
4. Registra a nova localização em `video_locations`

---

## Fluxo de Upload

```
1. Browser → POST /api/upload-intent { contentType: "video/webm" }
2. Gateway:
   a. Seleciona ISP healthy com mais disk_free
   b. Gera presigned URL via MinIO SDK do ISP selecionado
   c. Registra video_locations (video_id, isp_id, is_primary=true)
   d. Retorna { uploadUrl, fileKey, publicResolveUrl }

3. Browser → PUT {uploadUrl} [payload do vídeo — vai direto pro ISP, sem passar pelo gateway]

4. Browser → POST /api/videos (Disputatio Next.js) com { fileKey }
   Disputatio salva no Prisma: videoUrl = "https://gateway.disputatio.tv/resolve/{fileKey}"
```

## Fluxo de Download / Streaming

```
1. Player → GET https://gateway.disputatio.tv/resolve/{fileKey}
2. Gateway:
   a. Busca ISPs que têm o vídeo (video_locations)
   b. Filtra por health_status = 'healthy'
   c. Aplica peso (weight) — ISPs com mais banda disponível têm prioridade
   d. Return HTTP 302 → Location: http://{isp-minio-endpoint}/{bucket}/{fileKey}

3. Browser → Faz stream diretamente do ISP escolhido
   (Gateway não carrega nem 1 byte do vídeo)
```

---

## Estratégia de Seleção de ISP

### Para Upload
- ISP com `health_status = 'healthy'`
- Maior `disk_free_gb` (disk_total - disk_used)
- `is_active = true`
- Tie-break: menor `bandwidth_out_today_gb`

### Para Download
- Round-robin ponderado por `weight`
- Somente ISPs onde `video_locations` tem o `video_id`
- Fallback automático: se todos os ISPs caírem, retorna `503` com mensagem clara

---

## Estratégia de Replicação de Vídeos Quentes

Configurável pelo painel de admin (tabela `replication_config`):

| Parâmetro | Padrão | Descrição |
|---|---|---|
| `hot_video_threshold_views` | 100 | Visualizações que ativam replicação |
| `hot_video_window_hours` | 24 | Janela de tempo para contar views |
| `replication_enabled` | true | Liga/desliga replicação |
| `max_replicas` | 0 | Máximo de cópias (0 = todos os ISPs ativos) |

---

## Métricas de Banda

O gateway registra em `isps.bandwidth_out_today_gb` por ISP através de dois meios:
1. **Estimativa via logs de resolve**: conta os redirects 302 e multiplica pelo tamanho médio do vídeo (impreciso mas leve)
2. **MinIO Metrics API** (`/minio/v2/metrics/cluster`): coleta métricas reais de bytes enviados pelo MinIO (mais preciso, recomendado)

> **Nota sobre tráfego local**: O gateway pode descontar o tráfego de IPs no mesmo range do ISP consultando a tabela `isps.ipv4/ipv6` range. Isso é uma estimativa — tráfego verdadeiramente local (intra-ISP) pode ser excluído do gráfico de "banda externa".

---

## Visão de Evolução (Roadmap)

| Versão | Mudança |
|---|---|
| **v1** | Gateway na VM própria, ISPs só guardam vídeo |
| **v2** | Disputatio Next.js stateless, distribuído nos ISPs também |
| **v2** | Gateway distribuído com eleição de líder (Raft/etcd) |
| **v3** | GeoIP routing: usuário é redirecionado pro ISP mais próximo geograficamente |
| **v3** | Métricas de latência por ISP em tempo real para decisão de routing |
