# Guia de Atualização — Nó Disputatio

Este guia é destinado aos ISPs parceiros e explica como atualizar o stack do nó quando uma nova versão for disponibilizada.

---

## Quando Atualizar?

Você receberá um e-mail do time Disputatio com o assunto:
> **[Disputatio] Nova versão disponível — Nó v{X.Y.Z}**

As atualizações costumam ser de dois tipos:

| Tipo | O que muda | Downtime? |
|---|---|---|
| **node-agent** | Melhorias de monitoramento, novos comandos de replicação | Nenhum |
| **MinIO** | Atualizações de segurança ou novos recursos | ~30 segundos |
| **Ambos** | Atualização completa | ~30 segundos |

O e-mail vai especificar qual tipo de atualização é necessária.

---

## Atualização do node-agent (sem downtime)

```bash
cd ~/disputatio-node

# 1. Baixar a nova imagem
docker compose pull node-agent

# 2. Reiniciar somente o agent (MinIO continua rodando)
docker compose up -d --no-deps node-agent

# 3. Verificar que está rodando
docker compose ps
docker compose logs node-agent --tail=20
```

---

## Atualização Completa (node-agent + MinIO)

```bash
cd ~/disputatio-node

# 1. Baixar o novo docker-compose gerado pelo portal
#    (o e-mail vai incluir o link direto)
wget "https://portal.disputatio.tv/api/isp/SEU_TOKEN/compose" -O docker-compose.yml

# 2. Baixar as novas imagens
docker compose pull

# 3. Recriar os containers com as novas versões
docker compose up -d

# 4. Verificar status
docker compose ps
```

> **MinIO e seus dados**: o volume `disputatio_minio_data` é preservado entre atualizações. Seus dados de vídeo **nunca são apagados** durante uma atualização.

---

## Verificando se o Nó está Ativo Após Atualização

```bash
# Teste de saúde do MinIO
curl http://localhost:9000/minio/health/live
# Esperado: HTTP 200

# Verificar logs do node-agent (deve mostrar heartbeat enviado)
docker compose logs node-agent --tail=30

# Verificar no portal Disputatio
# https://portal.disputatio.tv/parceiros/SEU_SLUG/status
```

---

## Solução de Problemas

### MinIO não inicia após atualização

```bash
# Verificar logs
docker compose logs minio --tail=50

# Se necessário, forçar recriação
docker compose down
docker compose up -d
```

### node-agent não conecta ao Gateway

```bash
# Verificar conectividade
curl https://gateway.disputatio.tv/health

# Verificar logs do agent
docker compose logs node-agent

# Se ISP_TOKEN expirou, acesse o portal para renová-lo e
# atualize o docker-compose.yml
```

### Rollback para versão anterior

```bash
# Baixar o compose da versão anterior (solicitado via e-mail de suporte)
# OU edite o docker-compose.yml e altere a tag da imagem manualmente

# Reiniciar
docker compose up -d
```

---

## Suporte

- **Portal**: portal.disputatio.tv/suporte
- **E-mail**: infra@disputatio.tv
- **WhatsApp Técnico**: Informado no portal após cadastro

---

## Changelog de Versões

| Versão | Data | O que mudou |
|---|---|---|
| v0.1.0 | 2026-02-20 | Versão inicial — MinIO + node-agent básico |
