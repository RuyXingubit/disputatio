# Disputatio - Documentação Técnica do MVP

## 1. Product Requirements Document (PRD)

### 1.1 Objetivo do Produto
Criar uma plataforma de debate em vídeo assíncrono que fomente discussões estruturadas e aprofundadas. O sistema organiza os argumentos em formato de árvore usando vídeos (hospedados no YouTube) e cortes específicos (Aparte), permitindo uma contraposição clara de ideias (Tese vs. Antítese / Governo vs. Oposição).

### 1.2 Personas
1. **O Iniciador (Debatedor Pai):** Quer expor uma Moção (tese ou pauta) e convidar especialistas ou a comunidade para um debate. Tem um pensamento estruturado e deseja regras claras na discussão.
2. **O Respondente (Desafiante):** Assiste a uma Moção e encontra pontos com os quais discorda (ou concorda parcialmente). Deseja responder a um recorte específico da fala de origem através de um novo vídeo sem necessariamente ter que contra-argumentar a totalidade de um vídeo de meia hora.
3. **O Moderador/Mediador:** Criador do debate (ou eleito). Foca na curadoria e ordem lógica da árvore de debates, filtrando discursos de ódio e organizando quem tem espaço na discussão.
4. **O Espectador (Avaliador e Fact-Checker):** O público que consome o conteúdo. Avalia quem articulou os melhores pontos (votando, aumentando o Elo dos argumentadores) e ajuda a manter a verdade através da aba colaborativa de Fact-Checking.

### 1.3 Histórias de Usuário (User Stories)
- **Criação da Sala de Debate:** Como Iniciador, quero criar uma Moção (título e descrição) informando o link do meu vídeo de Tese Inicial, para instigar um novo debate.
- **Participação Direta:** Como Respondente, quero escolher um lado ("Governo" ou "Oposição") ao anexar o meu vídeo de resposta, definindo visualmente minha posição no branch da árvore da plataforma.
- **Sistemas de Aparte:** Como Respondente, quero selecionar um timestamp do vídeo do meu oponente (Ex: 01:20 até 01:35) ao gravar minha réplica, para que o sistema direcione o meu argumento só para aquele momento contextual específico.
- **Gestão de Acesso:** Como Iniciador, quero configurar as permissões do debate (Público vs. Convidados), para que eu possa ter debates amplos ou entre especialistas apenas.
- **Visualização Contextual:** Como Espectador, quero que o player pause o vídeo principal e me sugira o pop-up ou a timeline para eu assistir aos "Apartes" e tréplicas conectadas no momento em que a tese inicial estiver sendo dita (naquele momento do timestamp respectivo).

---

## 2. Especificações Funcionais (Regras de Negócio)

### 2.1 A Trilha do "Aparte Técnico"
O núcleo da unicidade da aplicação é permitir uma interrupção virtual construtiva:
* Quando um Respondente linka seu vídeo em resposta ao nó original, ele define `startTime` e `endTime` do vídeo-alvo.
* **Componente de Player Personalizado:** O player do plataforma deve ler esses metadados. Quando o vídeo original atinge o `startTime` configurado na réplica, uma notificação visual surge na tela (ou pausa via opção configurável pelo usuário) mostrando "Oposição pediu Aparte sobre esta afirmação".
* O usuário pode clicar, assistindo o vídeo-resposta, podendo escolher voltar ao vídeo original após seu fim ou continuar no branch daquela réplica (visto que oponente pode ter recebido tréplicas por si só).

### 2.2 Algoritmo de Curadoria e Visibilidade
Como um debate viral pode gerar galhos infinitos, limitamos aUI para mostrar apenas os de maior relevância por padrão:
* **Score Híbrido:** Os nós da árvore são ordenados inicialmente por interações (Visualizações no nó, upvotes de consistência retórica e total de nós-filhos pendurados a ele).
* **Moderação:** O criador/mediador pode dar um "Veto" em um determinado nó, ou marcar como "Ponto Pacificado/Pin", alterando sua visibilidade forçadamente em oposição ao orgânico.

### 2.3 Fact-Checking Colaborativo
Logo abaixo do reprodutor do nó do vídeo ativo:
* É renderizado uma lista/comentários com apenas 3 metadados principais: URL (A Fonte), Timestamp (À que momento refere-se), Tag (CONFIRMA, REFUTA ou CONTEXTUALIZA).
* Para postar, o usuário insere a sua fonte, que deve ser curada e votada via up/down da comunidade, evitando desinformação enraizada.

---

## 3. Arquitetura Técnica Sugerida

Focada em estabilidade, alto ranqueamento (SEO) e flexibilidade Serverless, sem gastar absurdos com hospedagem/banda (o processamento visual massivo está terceirizado pro YouTube).

### 3.1 Stack Tecnológica (MVP)
* **Frontend Web:** `Next.js` (App Router) + `React` + `TailwindCSS`. Uso agressivo de Server Components para a injeção do Open Graph (compartilhamento legal do link do debate com capas corretas).
* **UI de Fluxogramas (Árvore):** `React Flow` (recomenda-se para a renderização inteligente do mapa da árvore em Desktop) e componentes de `Framer Motion` para os cards intertissiais de Aparte do player.
* **Backend:** `Next.js API Routes` e `Server Actions` acopladas ao frontend.
* **Banco de Dados Relacional:** `PostgreSQL` (Gerenciado em Supabase ou Vercel Postgres). Devido a estrutura inerente de árvores e relações hierárquicas rígidas (Pai/Filho, Respostas, Votes), NoSQL não seria tão adequado quanto SQL.
* **ORM:** `Prisma` + TypeScript tipando o DB todo para evitar crashes.
* **Autenticação:** `Auth.js` ou `Clerk` focando amplamente no OAuth (Sign In With Google), essencial para sinergia futura ou atual com APIs do YT.
* **Player Integrado:** `YouTube IFrame API`. Controla eventos de Play/Pause, busca tempo e captura estados isolando a infra para zero-bytes locais transacionados.

### 3.2 Gerenciamento dos Metadados 
Ao postar uma moção/resposta colando o link do YT:
O Backend aciona a `YouTube Data API v3`. Retorna e salva APENAS o ID bruto (`youtube_id`), título cacheado, thumbnail cacheada, duração em segundos e channel owner. Isso blindará seu MVP de reajustes absurdos de peso na hospedagem.

---

## 4. Modelagem de Dados (MER com Prisma)

Uma estrutura modelada usando **Adjacency List** para fácil navegação e query rápida no nível pai-filho imediato.

```prisma
// Modelo de Usuário base
model User {
  id            String      @id @default(cuid())
  name          String
  email         String      @unique
  elo_rating    Int         @default(1200) // Score gamificado Retórico
  debates       Debate[]
  arguments     Argument[]
  fact_checks   FactCheck[]
}

// Sala da Discussão, Contexto Global
model Debate {
  id            String      @id @default(cuid())
  title         String
  description   String?
  created_at    DateTime    @default(now())
  is_public     Boolean     @default(true)
  creator_id    String
  creator       User        @relation(fields: [creator_id], references: [id])
  arguments     Argument[]
}

// Cada "Nó" seja a Moção ou a Réplica é um Argument
model Argument {
  id              String      @id @default(cuid())
  debate_id       String
  debate          Debate      @relation(fields: [debate_id], references: [id])
  user_id         String
  user            User        @relation(fields: [user_id], references: [id])
  
  // Árvore de Relação (Auto-referência)
  parent_id       String?     // se for Null, ele é a Moção Raiz
  parent          Argument?   @relation("ArgumentReplies", fields: [parent_id], references: [id])
  replies         Argument[]  @relation("ArgumentReplies")
  
  side            String      // GOVERNO, OPOSICAO, NEUTRO
  
  // YouTube 
  youtube_id      String
  video_duration  Int         // em segundos

  // Lógica do Aparte
  target_start    Int?        // O segundo inicial no vídeo 'parent' no qual isso faz sentido
  target_end      Int?        // O segundo final referenciado no vídeo 'parent'
  
  upvotes         Int         @default(0)
  created_at      DateTime    @default(now())
  
  fact_checks     FactCheck[]
}

// Fontes curadas 
model FactCheck {
  id            String      @id @default(cuid())
  argument_id   String
  argument      Argument    @relation(fields: [argument_id], references: [id])
  user_id       String
  user          User        @relation(fields: [user_id], references: [id])
  
  url           String
  target_time   Int         // A que segundo do argumento alvo esse fato corrobora
  claim_type    String      // CONFIRMA, REFUTA, ADICIONA_CONTEXTO
  votes         Int         @default(0)
}
```

---

## 5. Fluxo de Usuário (User Flow: Happy Path)

1. **Apresentação & Onboarding:** O usuário entra na landing page, entende a proposta e loga na conta Google com click único.
2. **Criação da Tese (Moção):** Clica no botão "Começar um Debate". Insere o título "A inteligência artificial tira postos criativos?". Focado e objetivo, ele insere o link de seu vídeo (pré-hospedado no Youtube) de 5 minutos, definindo ser "Público".
3. **Consumo Primário:** O algoritmo distribui a sala. O 'Usuário Desafiante' entra. A UI abre a Sala focada no Player da Moção e em uma árvore limpa, sem galhos ainda.
4. **Acionando o Aparte:** Aos "01m 45s", o Debatedor primário comete uma equivalência retórica falsa segundo o Desafiante. O Desafiante clica em "Pedir Aparte aqui". O modal congela a duração em 01:45 e recua margem visual na timeline, ele assinala que de 01:30 à 01:45 a lógica "X" falha.
5. **Replicação:** Ele defende seu ponto enviando um de seus vídeos-respostas no YouTube e clica ao lado da "Oposição". O layout processa que o ramo secundário foi materializado.
6. **Espectador final:** Um terceiro Usuário acessa meses depois. Ao dar Play do começo, o vídeo flui, até atingir a marca 01:30 onde um indicador dinâmico avisa: *"Há uma réplica pendente neste trecho. [Ver Oposição] ou [Prosseguir]"*. A experiência imersiva e assíncrona se consolida.

---

## 6. Funcionalidades Extras do Escopo (Evolutivas)

### 6.1 Elo Rating Híbrido - Gamificação Retórica
Todo perfil debute no sistema com 1200 pontos de Elo (inspirado sistema do xadrez ou do Tinder). À medida que espectadores votam a qualidade das argumentações (baseado num cap. de votos validados), o algoritmo debita pontos do perdedor da trilha de debate para o ganhador, utilizando o peso multiplicador *K*.
* Resultado real: Em longo prazo geraria um ranking de formadores de opiniões sólidos em suas esferas, com perfis que atraem espectadores pesados orgânicos. A qualidade supera a quantidade de gritaria.

### 6.2 O Juiz Inteligente (IA Referee)
Feature altamente agregadora usando a OpenAI (Whisper + GPT-4o) num processo em background atrelado à criação de cada Argumento-Nó na plataforma, funcionando assim:
* Ao anexar o Arg via YT no back-end, ele busca o SRT/Caption do vídeo.
* Submete o script num prompt do ChatGPT solicitando análises puramente de Lógica Argumentativa.
* **Auto-Tagging:** A API robô automaticamente aciona a tabela de `FactCheck` de sistema para pontuar falácias se achadas: _"Atenção - Neste timestamp (00:54), nota-se viés de falácia Ad Hominem: O apresentador ataca o oponente e não os argumentos em si."_
* Isso baliza discussões raivosas, esfriando a cabeça dos interlocutores humanos e elevando infinitamente o nível intelectual da aplicação, tirando da dependência apenas do moderador biológico central.
