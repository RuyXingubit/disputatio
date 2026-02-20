# Disputatio

Plataforma de Debate em Vídeo Assíncrono.

## 🚀 Estado Atual (MVP v1.0)

O MVP foi concluído com sucesso, implementando o "Core Loop" da plataforma em um Vertical Slice utilizando Next.js (App Router), Prisma e PostgreSQL.

Funcionalidades implementadas:
*   **Autenticação Local:** Sistema de login e cadastro nativo com NextAuth (Credentials) e bcrypt.
*   **Player Interativo de Vídeo:** Integração com YouTube IFrame API sincronizado globalmente.
*   **Aparte Temporal (Balões):** Visualização interativa no próprio vídeo informando quando alguém contestou ou corroborou um argumento no exato minuto em que a interrupção ocorreu.
*   **Thread Infinita (A Árvore):** Navegação entre vídeos originais e sub-respostas mantendo tudo na mesma aba, sem recarregamentos, simulando uma imersão contínua no debate.
*   **Feed de Moções (Mural):** Página inicial atuando como Dashboard listando debates criados pela comunidade e contabilidade de apartes gerados.
*   **Histórico de Texto (Estilo Reddit):** Lista recuada de comentários de uma thread em texto com suporte a cliques profundos.

## 🔜 Próximos Passos (Milestone 1.1)

Com a arquitetura central validada e as views responsivas desenhadas, o foco agora é gamificação e administração:

1.  **Elo Rating System:** Implementar um sistema de ranking em que as pessoas perdem e ganham pontos baseado na eficácia e votação popular de seus apartes.
2.  **Moderação Avançada:** Permitir que Opositores vetem/concluam um ponto levantado sem esticarem a thread ad-finitum.
3.  **Votação (Upvote/Downvote):** Implementar sistema de aprovação nos cartões Textuais.
4.  **Integração com IA Juíza:** Iniciar a construção de LLM que avalia quem fez bons argumentos.

## 🛠️ Tecnologias Principais

*   [Next.js 15+](https://nextjs.org) - App Router
*   [Tailwind CSS v4](https://tailwindcss.com) - Estilização
*   [Prisma ORM](https://prisma.io) - Banco de Dados (PostgreSQL)
*   [Auth.js (NextAuth)](https://authjs.dev) - Autenticação
*   [React YouTube](https://github.com/tjallingt/react-youtube) - Wrapper IFrame
