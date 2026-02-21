# Onboarding de ISPs — Disputatio

## Visão Geral

Qualquer ISP brasileiro com infraestrutura Proxmox pode se tornar um nó de armazenamento do Disputatio. O processo é deliberadamente simples: o ISP se cadastra no portal, recebe um `docker-compose.yml` gerado automaticamente e sobe o stack com um único comando.

---

## Portal de Cadastro — Fluxo do ISP

```
1. ISP acessa portal.disputatio.tv/parceiros
2. Preenche formulário:
   - Nome do provedor
   - CNPJ
   - Cidade / Estado
   - IP Público v4 da VM (obrigatório)
   - IP Público v6 da VM (opcional, mas recomendado)
   - Capacidade de armazenamento ofertada (GB)
   - Contato técnico (e-mail + WhatsApp)

3. Sistema:
   - Gera um ISP_TOKEN único (UUID)
   - Gera um MINIO_ACCESS_KEY e MINIO_SECRET_KEY exclusivos para o ISP
   - Cria o docker-compose.yml personalizado
   - Envia por e-mail E disponibiliza para download imediato

4. Admin Disputatio recebe alerta → Aprova o ISP no painel
5. Gateway começa a incluir o ISP no pool de roteamento
```

---

## Docker Compose Gerado (Template)

O sistema gera este arquivo dinamicamente com as variáveis do ISP preenchidas:

```yaml
# Disputatio Node — [NOME_DO_ISP]
# Gerado em: [TIMESTAMP]
# ISP Token: [ISP_TOKEN]
# NÃO compartilhe este arquivo — ele contém credenciais únicas do seu nó.

version: '3.8'

services:
  minio:
    image: minio/minio:RELEASE.2025-01-20T14-49-07Z
    container_name: disputatio-node
    restart: always
    environment:
      MINIO_ROOT_USER: [ACCESS_KEY_GERADO]
      MINIO_ROOT_PASSWORD: [SECRET_KEY_GERADO]
      MINIO_SITE_NAME: [SLUG_DO_ISP]
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"   # API S3 (acesso pelo Gateway)
      - "9001:9001"   # Console Web (somente local)
    volumes:
      - minio_data:/data
    networks:
      - disputatio
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  node-agent:
    image: disputatio/node-agent:latest
    container_name: disputatio-agent
    restart: always
    environment:
      ISP_TOKEN: [ISP_TOKEN]
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: [ACCESS_KEY_GERADO]
      MINIO_SECRET_KEY: [SECRET_KEY_GERADO]
      MINIO_BUCKET: disputatio-videos
      GATEWAY_URL: https://gateway.disputatio.tv
      REPORT_INTERVAL_SECONDS: 30
    networks:
      - disputatio
    depends_on:
      - minio

  minio-setup:
    image: minio/mc:latest
    container_name: disputatio-setup
    depends_on:
      - minio
    environment:
      MINIO_ROOT_USER: [ACCESS_KEY_GERADO]
      MINIO_ROOT_PASSWORD: [SECRET_KEY_GERADO]
    entrypoint: >
      /bin/sh -c "
        sleep 5;
        /usr/bin/mc alias set node http://minio:9000 $${MINIO_ROOT_USER} $${MINIO_ROOT_PASSWORD};
        /usr/bin/mc mb node/disputatio-videos --ignore-existing;
        /usr/bin/mc anonymous set download node/disputatio-videos;
        echo 'Nó Disputatio configurado com sucesso!';
        exit 0;
      "
    networks:
      - disputatio

volumes:
  minio_data:
    name: disputatio_minio_data

networks:
  disputatio:
    name: disputatio_network
    driver: bridge
```

### Componente `node-agent`

O `disputatio/node-agent` é uma imagem Docker leve (baseada em Alpine) mantida pelo time Disputatio. Responsabilidades:

- **Heartbeat**: a cada `REPORT_INTERVAL_SECONDS`, envia para o Gateway:
  - Bytes usados / disponíveis no MinIO
  - Métricas de banda (via MinIO Metrics API `/minio/v2/metrics/cluster`)
  - Status de saúde do MinIO local
- **Auto-registro**: no primeiro boot, registra o nó no Gateway usando `ISP_TOKEN`
- **Recebe comandos de replicação**: o Gateway pode solicitar ao agent que inicie uma cópia de vídeo de outro ISP

Isso permite que o Gateway sempre saiba o estado real de cada nó sem polling diretamente no MinIO.

---

## Instruções de Instalação (para o ISP)

O portal gera uma página de instruções personalizada. Conteúdo:

### Pré-requisitos
```bash
# 1. Instalar Docker CE (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 2. Verificar instalação
docker --version
docker compose version
```

### Subindo o Nó
```bash
# 1. Criar pasta do nó
mkdir -p ~/disputatio-node && cd ~/disputatio-node

# 2. Baixar o docker-compose gerado pelo portal
# (ou copiar o arquivo enviado por e-mail)
wget https://portal.disputatio.tv/api/isp/[ISP_TOKEN]/compose -O docker-compose.yml

# 3. Subir o stack
docker compose up -d

# 4. Verificar logs
docker compose logs -f
```

### Verificando se o Nó está Ativo
```bash
# Teste de conectividade MinIO
curl http://[SEU_IP_PUBLICO]:9000/minio/health/live
# Expected: HTTP 200

# Verificar no portal
# portal.disputatio.tv/parceiros/[SEU_SLUG]/status
```

---

## Atualização do Stack

Quando o time Disputatio lança uma nova versão do `node-agent`, o ISP é notificado por e-mail e pode atualizar com:

```bash
cd ~/disputatio-node

# Baixar novas versões das imagens
docker compose pull

# Reiniciar com zero downtime (MinIO permanece rodando)
docker compose up -d --no-deps node-agent

# Verificar versão atualizada
docker compose ps
```

> **Nota**: A imagem `minio/minio` usa uma tag de versão fixa (`RELEASE.YYYY-MM-DD...`) no compose gerado. Para atualizar o MinIO, o portal gera um compose novo com a tag atualizada, e o ISP baixa o arquivo e faz `docker compose up -d`.

---

## Segurança

| Item | Medida |
|---|---|
| Porta 9001 (Console MinIO) | Não deve ser exposta publicamente — use firewall |
| Porta 9000 (API S3) | Exposta publicamente, mas autenticada via MINIO_ACCESS_KEY |
| ISP_TOKEN | Revogável pelo admin do Disputatio a qualquer momento |
| Credenciais MinIO | Geradas aleatoriamente por ISP, nunca reutilizadas |
| Comunicação Gateway→Agent | HTTPS + token de autenticação |

### Configuração de Firewall Recomendada (UFW)
```bash
# Permitir apenas porta S3 pública
sudo ufw allow 9000/tcp comment 'Disputatio MinIO S3'

# Console MinIO somente local (opcional, para debugging)
sudo ufw deny 9001/tcp

# Liberar SSH
sudo ufw allow 22/tcp

sudo ufw enable
```
