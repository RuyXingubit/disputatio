# Disputatio — Plataforma de Debates

O **Disputatio** é uma plataforma open-source desenvolvida para registrar e organizar debates temáticos gamificados. Esta imagem Docker oficial contém a aplicação web pronta para produção, configurada para ser hospedada por ISPs (Provedores de Internet) ou infraestruturas próprias.

---

## 🚀 Como rodar localmente (Dev)

Para testes ou desenvolvimento rápido, você pode subir o banco de dados (PostgreSQL) usando Docker e rodar a aplicação via Node:

```bash
# Baixe os arquivos do repositório
git clone https://github.com/RuyXingubit/disputatio.git
cd disputatio

# Suba o banco de dados e o storage (MinIO) de desenvolvimento
docker compose up -d

# Instale as dependências e rode o projeto (requer Node 22+)
npm install
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

---

## 💼 Como subir em Produção (Provedores / ISPs)

Para hospedar o Disputatio na sua própria infraestrutura em produção, recomendamos o uso de nosso Docker Compose de produção, que já inclui proxy e **SSL automático** via Caddy Server.

### Pré-requisitos
- Servidor (VM / VPS) com Docker e Docker Compose instalados
- Apontamento DNS (ex: `seudominio.com.br`) para o IP deste servidor

### Passo a passo para o Deploy

**1. Baixe a infraestrutura base:**
Crie uma pasta e baixe a configuração mínima necessária:
```bash
mkdir disputatio && cd disputatio
curl -O https://raw.githubusercontent.com/RuyXingubit/disputatio/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/RuyXingubit/disputatio/main/Caddyfile
curl -O https://raw.githubusercontent.com/RuyXingubit/disputatio/main/.env.prod.example
```

**2. Configure as variáveis de ambiente:**
```bash
cp .env.prod.example .env.prod
nano .env.prod
```
> Edite o arquivo inserindo sua conexão com o banco (`DATABASE_URL`), credenciais do seu S3/Gateway (`GATEWAY_URL`), e definindo um segredo forte em `AUTH_SECRET`.

**3. Inicie os containers:**
```bash
docker compose -f docker-compose.prod.yml up -d
```
O Caddy irá solicitar seu certificado SSL gratuitamente via Let's Encrypt e direcionar o tráfego da porta 443 para o container da aplicação Next.js.

**4. Execute as migrações iniciais do banco:**
```bash
docker compose -f docker-compose.prod.yml exec app npx prisma@6 migrate deploy
```

---

## 🔧 Variáveis de Ambiente Principais

Ao rodar o container separadamente, garanta que as seguintes variáveis estejam presentes:

- `DATABASE_URL`: String de conexão com seu PostgreSQL
- `AUTH_SECRET`: String aleatória de 32 caracteres (usado pelo Auth.js para criptografia de sessão)
- `AUTH_TRUST_HOST`: Deve ser `"true"` em produção
- `AUTH_URL`: A URL pública oficial do sistema (ex: `https://disputatio.com.br`)
- `GATEWAY_URL`: O endpoint raiz do Gateway ISP de vídeos (caso utilize a rede descentralizada) ou MinIO local.

---

## 📚 Mais Informações

Para o guia arquitetural completo do Gateway de Vídeos ou integração com ISPs, visite o diretório `/docs` no nosso repositório do [GitHub](https://github.com/RuyXingubit/disputatio).
