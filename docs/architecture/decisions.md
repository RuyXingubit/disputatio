# Architecture Decision Records (ADRs)

Registro de decisões arquiteturais importantes tomadas no projeto Disputatio.

---

## ADR-001: Gateway Leve com Presigned URLs (Option C)

**Status:** Aceito  
**Data:** 2026-02-20  

### Contexto
Precisávamos de uma arquitetura de armazenamento de vídeo distribuída entre múltiplos ISPs brasileiros, com resiliência e balanceamento de carga, sem depender de CDN comercial de alto custo.

### Decisão
Implementar um gateway que **nunca carrega payload de vídeo**. Em vez disso, emite URLs assinadas (presigned URLs) geradas pelo SDK do MinIO de cada ISP, e o browser comunica diretamente com o MinIO do ISP escolhido.

### Alternativas Rejeitadas

| Opção | Motivo da Rejeição |
|---|---|
| **A — Proxy Ativo** | Gateway consome banda do vídeo (double bandwidth). Não escala sem custo. |
| **B — MinIO Site Replication** | Replica tudo para todos os ISPs, consome 3x armazenamento. Não permite replicação seletiva. |
| **D — Cloudflare R2** | Cria dependência de terceiro. ISPs não seriam peers ativos na infraestrutura. |

### Consequências
- ✅ Gateway stateless, fácil de replicar na v2
- ✅ ISPs absorvem 100% do tráfego de vídeo
- ✅ Replicação seletiva economiza armazenamento
- ⚠️ Requer que as portas MinIO dos ISPs sejam acessíveis publicamente

---

## ADR-002: node-agent como Sidecar nos ISPs

**Status:** Aceito  
**Data:** 2026-02-20  

### Contexto
O gateway precisa conhecer o estado de cada nó ISP (disco, banda, saúde) em tempo real. Precisávamos escolher entre polling ativo pelo gateway ou push passivo pelo ISP.

### Decisão
Cada ISP sobe um container `disputatio/node-agent` junto com o MinIO. O agent envia heartbeats ativos a cada 30 segundos para o gateway.

### Motivos
- **Firewall-friendly**: o agent inicia a conexão de saída para o gateway, dispensando que o gateway tenha acesso direto ao port de administração MinIO
- **Atualização independente**: podemos atualizar o agent mandando um novo `docker pull` sem tocar no MinIO
- **Replicação coordenada**: o agent pode executar comandos `mc cp` localmente, sem que o gateway mova dados

---

## ADR-003: Replicação Seletiva por Threshold de Views

**Status:** Aceito  
**Data:** 2026-02-20  

### Contexto
Replicar todos os vídeos para todos os ISPs consiste em 3x o armazenamento desde o primeiro byte uploaded. Isso inviabiliza operação com ISPs parceiros no início.

### Decisão
Apenas vídeos que excedem um threshold configurável de visualizações em uma janela de tempo são replicados para os demais ISPs.

### Configurações padrão
- Threshold: 100 visualizações em 24 horas
- `max_replicas = 0` por padrão = replica para **todos os ISPs ativos** (sem limite fixo)
- Configurável em tempo real pelo painel de admin

### Consequências
- ✅ ISPs têm armazenamento gerenciável no início
- ✅ Conteúdo popular recebe redundância automaticamente
- ⚠️ Vídeos "frios" ficam em apenas 1 ISP — se esse ISP cair, o vídeo fica temporariamente indisponível

---

## ADR-004: dockercompose.yml Gerado Dinamicamente por ISP

**Status:** Aceito  
**Data:** 2026-02-20  

### Contexto
ISPs usam Proxmox com VMs Linux. Precisávamos de uma forma simples e segura de entregar a configuração do stack para cada parceiro, com credenciais únicas e sem configuração manual.

### Decisão
O portal de onboarding gera um `docker-compose.yml` único por ISP com:
- `MINIO_ACCESS_KEY` e `MINIO_SECRET_KEY` gerados aleatoriamente
- `ISP_TOKEN` único para autenticação do node-agent
- Versões pinadas (não `latest`) para estabilidade

### Consequências
- ✅ ISP sobe o nó com 3 comandos (`mkdir`, `wget`, `docker compose up -d`)
- ✅ Credenciais isoladas por ISP — revogáveis individualmente
- ✅ Atualizações do node-agent via `docker compose pull && docker compose up -d`
- ⚠️ ISP precisa ter Docker CE instalado (instrução no portal)

---

## ADR-005: Disputatio App Permanece em VM Própria na v1

**Status:** Aceito  
**Data:** 2026-02-20  

### Contexto
A visão de longo prazo é distribuir o app Next.js nos próprios ISPs. Porém isso requer tornar o app stateless (sessão externalizada, sem estado local).

### Decisão
Na v1, o app Next.js e o gateway permanecem na VM própria (IP `143.208.136.56`). Os ISPs contribuem apenas com armazenamento.

### Roadmap de Migração
1. **v1**: App + Gateway na VM própria. ISPs = storage apenas.
2. **v2**: Tornar Next.js stateless (sessão no Redis, uploads via gateway). Distribuir replicas nos ISPs.
3. **v3**: Gateway distribuído com eleição de líder. GeoIP routing.
