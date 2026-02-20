import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

// Estendendo tipagens do NextAuth pra injetar nosso Elo gamificado
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      elo_rating?: number
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  cookies: {
    sessionToken: {
      name: `disputatio.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    }
  },
  providers: [
    Credentials({
      name: "Sua Conta",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Preencha e-mail e senha.")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) {
          throw new Error("Usuário não encontrado.")
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValidPassword) {
          throw new Error("Senha incorreta.")
        }

        return user
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        // Typecast pro Prisma model user
        token.elo_rating = (user as any).elo_rating
      }

      // Se precisar atualizar o elo sem relogar (ex: via useSession({update}))
      if (trigger === "update" && session?.elo_rating) {
        token.elo_rating = session.elo_rating
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        if (token.elo_rating !== undefined) {
          session.user.elo_rating = token.elo_rating as number
        }
      }
      return session
    }
  }
})
