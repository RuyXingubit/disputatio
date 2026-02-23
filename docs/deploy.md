# Deploy — Disputatio em Produção

Guia para subir o Disputatio na VM de produção com HTTPS via Caddy.

---

## Pré-requisitos

- Docker e Docker Compose instalados na VM
- DNS de `disputatio.com.br` e `www.disputatio.com.br` apontando para o IP da VM
- Imagem Docker publicada no Docker Hub via CI/CD

---

## 1. Clonar o repositório na VM

```bash
git clone https://github.com/RuyXingubit/disputatio.git
cd disputatio
```

> Se já clonou antes, basta `git pull origin main`.

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

## 4. Aplicar migrações do Prisma

Na primeira vez (ou quando houver migrações novas):

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
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

## Atualizando (Deploy contínuo)

Quando você faz push na `main`, o GitHub Actions builda e publica a imagem no Docker Hub. Na VM:

```bash
cd disputatio
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

> **Dica**: Automatize isso com um webhook ou cron.

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
