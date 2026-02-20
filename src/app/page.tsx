import { AuthStatus } from "@/components/auth/AuthButtons"
import { CreateDebateButton } from "@/components/debate/CreateDebateButton"
import { auth } from "@/auth"
import prisma from "@/prisma"
import Link from "next/link"
import { MessageSquareText } from "lucide-react"

export default async function Home() {
  const session = await auth()

  // Buscar todos os debates (moções raiz) do sistema
  const debates = await prisma.debate.findMany({
    include: {
      creator: true,
      arguments: {
        where: { parent_id: null },
        take: 1
      },
      _count: {
        select: { arguments: true }
      }
    },
    orderBy: { created_at: 'desc' }
  })

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 p-6 md:p-12 font-sans selection:bg-red-500/30">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header Simples */}
        <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-red-500">▶</span> Disputatio
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Plataforma de Debate em Vídeo Assíncrono</p>
          </div>
          <div className="flex items-center gap-4">
            {session?.user && <CreateDebateButton />}
            <AuthStatus session={session} />
          </div>
        </header>

        {/* Hero Section */}
        <section className="space-y-4 pt-4">
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl shadow-sm text-white">
            Mural de Debates
          </h2>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">
            Escolha uma moção em andamento para assistir aos vídeos base e contribuir com seus <strong>Apartes</strong>.
          </p>

          <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2">
            {debates.map((debate) => {
              const rootVideoId = debate.arguments[0]?.youtube_id || ""
              return (
                <Link
                  href={`/debate/${debate.id}`}
                  key={debate.id}
                  className="block p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors shadow-sm group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300 uppercase tracking-wider">
                      Aberta
                    </span>
                    <div className="flex items-center text-zinc-500 text-xs font-semibold gap-1 group-hover:text-red-400 transition-colors">
                      <MessageSquareText className="w-4 h-4" />
                      {debate._count.arguments}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-zinc-100 leading-tight mb-2 group-hover:text-red-400 transition-colors">
                    {debate.title}
                  </h3>

                  <div className="flex items-center text-xs text-zinc-500 gap-2 mt-4">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                      {debate.creator.name?.charAt(0) || "U"}
                    </span>
                    Criado por {debate.creator.name}
                  </div>
                </Link>
              )
            })}

            {debates.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-12 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                Nenhuma moção criada ainda.
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  )
}
