# Landing Page — Disputatio ISP

## Objetivo da Página

Convencer ISPs brasileiros a se tornarem nós de armazenamento do **Disputatio ISP**. A página deve comunicar:
1. **O que é** o projeto e por que é relevante
2. **Qual o benefício** para o ISP (visibilidade, uso de infraestrutura ociosa)
3. **Como funciona** de forma bem simples
4. **Tirar dúvidas** via FAQ
5. **CTA** (chamada para ação) para cadastro

---

## Estrutura de Seções

```
┌─────────────────────────────────────┐
│           HERO                      │  ← primeira dobra, acima do fold
├─────────────────────────────────────┤
│       COMO FUNCIONA                 │
├─────────────────────────────────────┤
│       BENEFÍCIOS                    │
├─────────────────────────────────────┤
│       MAPA DE PARCEIROS             │  ← ISPs ativos no mapa do BR
├─────────────────────────────────────┤
│           FAQ                       │
├─────────────────────────────────────┤
│     CTA FINAL + FORMULÁRIO          │
├─────────────────────────────────────┤
│           RODAPÉ                    │
└─────────────────────────────────────┘
```

---

## Seção 1 — HERO

**Heading principal (H1):**
> Sua infraestrutura ociosa, servindo a liberdade de expressão

**Subtítulo:**
> O Disputatio é uma plataforma brasileira de debates em vídeo. O **Disputatio ISP** é o programa de parceria para provedores que querem contribuir com armazenamento e entrega de vídeos. Se você tem servidores com espaço sobrando, vamos conversar.

**CTA primário:** `Quero ser parceiro ISP` → âncora para o formulário de cadastro

**CTA secundário:** `Ver como funciona ↓` → âncora para seção "Como Funciona"

**Visual sugerido:** Mapa estilizado do Brasil com pontos de presença dos ISPs já cadastrados. Cada ponto acende conforme novos parceiros entram.

---

## Seção 2 — COMO FUNCIONA

**Título:** Como funciona a parceria

**Apresentação em 4 passos (timeline horizontal ou cards):**

| Passo | Ícone | Título | Descrição |
|---|---|---|---|
| 1 | 📋 | Cadastre sua empresa | Preencha o formulário com os dados do seu provedor e a VM que vai usar |
| 2 | ⚙️ | Receba sua configuração | Geramos um `docker-compose.yml` único com suas credenciais em segundos |
| 3 | 🐳 | Suba em 3 comandos | Instale o Docker, baixe o arquivo e execute `docker compose up -d` |
| 4 | 📡 | Pronto — você é um nó | Seu servidor já aparece no pool. Atualizações chegam automaticamente |

**Bloco de código exibido na página (para dar sensação técnica):**
```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Baixar configuração personalizada
wget https://portal.disputatio.tv/api/isp/SEU_TOKEN/compose -O docker-compose.yml

# Subir o nó
docker compose up -d
```

---

## Seção 3 — BENEFÍCIOS

**Título:** O que você ganha sendo parceiro

**Cards de benefícios:**

| Benefício | Descrição |
|---|---|
| 🏅 **Selo de Parceiro** | Exibimos o nome e logo do seu ISP na plataforma e no mapa de nós |
| 📊 **Dashboard em tempo real** | Você vê exatamente quanta banda e armazenamento está usando — e descontamos o tráfego local |
| 🔒 **Zero risco técnico** | Você controla seu servidor. Pode sair da parceria a qualquer momento removendo o container |
| 🔄 **Atualizações automáticas** | Nosso agente se atualiza sozinho. Sem manutenção manual |
| 🌐 **Contribuição real** | Você ajuda a construir uma plataforma nacional de debate livre de monopólios de CDN |
| 💡 **Infraestrutura bem usada** | Muitos ISPs têm capacidade ociosa. Isso a coloca pra trabalhar sem custo adicional |

---

## Seção 4 — MAPA DE PARCEIROS

**Título:** Nós ativos agora

Mapa interativo do Brasil mostrando:
- Pontos nos estados com ISPs cadastrados
- Ao hover: nome do ISP, cidade, status (ativo/inativo)
- Contador de ISPs ativos e total de TB disponíveis

> **Nota de implementação:** Usar [Leaflet.js](https://leafletjs.com/) com tile OpenStreetMap ou um SVG do mapa do Brasil com interatividade simples. Os dados vêm da API pública `/api/public/isps-map` que retorna apenas nome, cidade, UF e coordenadas — sem expor IPs ou credenciais.

---

## Seção 5 — FAQ

**Título:** Dúvidas frequentes

| Pergunta | Resposta |
|---|---|
| **Preciso abrir minha rede para o público?** | Apenas a porta 9000 (MinIO S3) precisa estar acessível. O console de administração (porta 9001) pode ser bloqueado no firewall. |
| **Quanto de armazenamento preciso oferecer?** | Não há mínimo. Qualquer quantidade é bem-vinda. Você configura o disco da VM e nosso sistema respeita o limite. |
| **E se meu servidor cair?** | O Gateway detecta automaticamente e redireciona os usuários para outro nó. Nenhum vídeo é perdido, pois mantemos redundância. |
| **Posso ver o que está armazenado no meu servidor?** | Sim. Você tem acesso ao console do MinIO local. Os vídeos são objetos S3 com chaves opacas (UUIDs). |
| **Posso sair da parceria a qualquer momento?** | Sim. Basta executar `docker compose down` e apagar o volume. Revogamos seu token no portal imediatamente. |
| **O Disputatio acessa meu servidor de outras formas?** | Apenas via MinIO API (S3) com as credenciais que geramos. O node-agent só se comunica de saída para o gateway. |
| **Preciso pagar algo?** | Não. A parceria é gratuita. Você oferece infraestrutura, nós oferecemos a plataforma. |
| **Quantos ISPs já estão participando?** | Veja o mapa ao vivo acima — ele reflete os parceiros ativos em tempo real. |

---

## Seção 6 — CTA FINAL + FORMULÁRIO

**Título:** Que tal fazer parte disso?

**Subtítulo:**
> O cadastro leva menos de 5 minutos. Após aprovação, você recebe o docker-compose personalizado por e-mail.

**Formulário (campos):**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome do provedor | Text | ✅ |
| CNPJ | Text (mask) | ✅ |
| Cidade | Text | ✅ |
| Estado (UF) | Select | ✅ |
| IP Público da VM | Text | ✅ |
| Capacidade de armazenamento (GB) | Number | ✅ |
| Nome do responsável técnico | Text | ✅ |
| E-mail do técnico | Email | ✅ |
| WhatsApp do técnico | Text | ✅ |
| Tem IPv6? | Checkbox | ❌ |
| IPv6 da VM | Text (condicional) | ❌ |

**Após envio:**
- Mensagem: *"Recebemos seu cadastro! Em breve você receberá o docker-compose no e-mail cadastrado. Enquanto isso, leia o [guia de instalação →]"*
- Admin recebe notificação via e-mail ou webhook (Slack/Discord)

---

## Seção 7 — RODAPÉ

- Link: Disputatio (site principal)
- Link: Documentação técnica completa
- Link: Guia de atualização do nó
- Link: Política de privacidade
- Contato: `parceiros@disputatio.tv`

---

## Identidade Visual

> Seguir a identidade do Disputatio principal (Next.js app). Paleta escura, tipografia moderna. Sem roxo/violeta (Purple Ban do projeto).

**Tom de voz:** Técnico, mas acessível. Fala com o dono do provedor regional — que entende de redes mas não necessariamente de sistemas distribuídos. Sem jargão excessivo.

---

## Notas de Implementação

- **Projeto**: `disputatio-video` — este repositório, rota `/` (raiz, app Next.js separado do Disputatio principal)
- A rota `/api/isp/[token]/compose` gera o YAML dinâmico com template (string template TS ou Mustache)
- A rota `/api/public/isps-map` retorna JSON com dados públicos dos ISPs (sem credenciais)
- O formulário de cadastro chama `/api/isp/register` (POST) — cria ISP com `is_active = false` e dispara e-mail para o admin

### Integração com o Disputatio principal

No app `disputatio` (plataforma de debates), adicionar um link discreto para ISPs:

> **Copy sugerido para o Disputatio:**
> "Você é um provedor de internet? [Ajude a Disputatio a crescer →](https://isp.disputatio.tv)"

**Locais sugeridos no Disputatio:**
- Rodapé da página principal
- Página "Sobre" (se existir)
