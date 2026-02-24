# Deploy — Disputatio em Produção

Guia para subir o Disputatio na VM de produção com HTTPS via Caddy.

---

## Pré-requisitos

- Docker e Docker Compose instalados na VM
- DNS de `disputatio.com.br` e `www.disputatio.com.br` apontando para o IP da VM
- Imagem Docker publicada no Docker Hub via CI/CD

---

## 1. Baixar os arquivos na VM

Como a aplicação já está encapsulada na imagem do Docker Hub, **não é necessário** clonar todo o código-fonte (arquivos `.ts`, `.tsx`, etc) no servidor final. Você precisa apenas dos arquivos de infraestrutura.

Crie uma pasta para o projeto e baixe os arquivos essenciais de configuração:

```bash
mkdir disputatio && cd disputatio

# 1. Obter a configuração do Compose
curl -O https://raw.githubusercontent.com/RuyXingubit/disputatio/main/docker-compose.prod.yml

# 2. Obter as regras de roteamento HTTP/SSL
curl -O https://raw.githubusercontent.com/RuyXingubit/disputatio/main/Caddyfile

# 3. Baixar o template de variáveis de ambiente
curl -O https://raw.githubusercontent.com/RuyXingubit/disputatio/main/.env.prod.example
```

---

## 2. Criar o `.env.prod`

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Preencha os valores reais do banco de dados e chaves:

```env
# Banco de Dados (PostgreSQL integrado)
POSTGRES_USER="disputatio_user"
POSTGRES_PASSWORD="SUA_SENHA_SEGURA_AQUI"
POSTGRES_DB="disputatio_db"

# URL do banco referenciando a rede interna do Compose (db:5432)
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public"

AUTH_SECRET="SUA_CHAVE_SECRETA_AQUI_GERADA_COM_OPENSSL"
AUTH_TRUST_HOST=true
AUTH_URL="https://disputatio.com.br"
GATEWAY_URL="https://video.disputatio.com.br"
DOCKERHUB_USERNAME="xingubit"
```

Para gerar o `AUTH_SECRET`:
```bash
openssl rand -hex 32
```

---

## 3. Subir os containers

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

O Caddy vai automaticamente:
- Obter certificado SSL via Let's Encrypt (ACME)
- Servir `https://disputatio.com.br`
- Redirecionar `www.disputatio.com.br` → `disputatio.com.br`

---

## 4. Estruturar o banco de dados

**Isso agora é automático!** 🚀

Graças à última atualização no `Dockerfile`, o contêiner roda `npx prisma db push --skip-generate` automaticamente assim que é iniciado, garantindo que suas tabelas e colunas estejam sempre sincronizadas com o código mais recente, sem precisar de comandos manuais.

Se por acaso você precisar forçar alguma alteração manual, o comando seria:
```bash
docker compose -f docker-compose.prod.yml exec app sh -c "node_modules/prisma/build/index.js db push --skip-generate"
```

---

## 5. Verificar

```bash
# Status dos containers
docker compose -f docker-compose.prod.yml ps

# Logs do Caddy (certificado SSL)
docker compose -f docker-compose.prod.yml logs caddy

# Logs da app
docker compose -f docker-compose.prod.yml logs app

# Testar HTTPS
curl -I https://disputatio.com.br
```

---

## Atualizando a Aplicação (Upgrades rápidos)

Para manter a aplicação sempre na versão mais recente sem quedas (zero-downtime) após o GitHub Actions publicar uma nova imagem, execute estes 3 passos ágeis na sua VM:

```bash
cd disputatio

# 1. Baixe a versão mais recente do código
docker compose -f docker-compose.prod.yml pull

# 2. Recrie os contêineres que foram atualizados (o Caddy e DB permanecem intactos)
docker compose -f docker-compose.prod.yml up -d

# O banco de dados já será sincronizado automaticamente quando o contêiner subir!
# Não é mais necessário rodar o `prisma db push` manualmente.
```

> **Nota**: Se você alterou configurações no `Caddyfile` ou `docker-compose.prod.yml` no GitHub durante esse ciclo, será necessário rodar o `curl -O ...` novamente antes do `up -d` para atualizar esses arquivos localmente na VM.

> **Dica**: Automatize isso com um webhook esportando uma rota no Caddy, usando Watchtower ou agendando um cron job simples.

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Certificado não gerado | Verifique que as portas 80 e 443 estão abertas no firewall e o DNS aponta pro IP correto |
| App não conecta no Postgres | Verifique as credenciais no `.env.prod` e observe os logs do banco com `docker compose -f docker-compose.prod.yml logs db` |
| Imagem não encontrada | Verifique o `DOCKERHUB_USERNAME` no `.env.prod` e se o CI/CD rodou com sucesso |
| `www` não redireciona | O DNS `www.disputatio.com.br` precisa ter um registro A ou CNAME pro IP da VM |

---

## Arquitetura em Produção

```text
Browser
  │
  ▼
┌─────────────┐     ┌──────────────────────┐
│   Caddy     │────▶│    App (Next.js)     │
│  :80 :443   │     │    container:3000    │
│  SSL auto   │     └────────┬─────────────┘
└─────────────┘              │
                             ▼
                    ┌──────────────────────┐
                    │ Postgres (Integrado) │
                    │     container:db     │
                    │        :5432         │
                    └──────────────────────┘
                             │
     ┌───────────────────────┘
     ▼
┌────────────────────┐
│  Gateway ISP       │  (outra VM)
│  video.disputatio  │
│  .com.br           │
└────────────────────┘
```
