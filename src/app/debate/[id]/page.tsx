import { InteractivePlayer } from "@/components/player/InteractivePlayer"
import { AuthStatus } from "@/components/auth/AuthButtons"
import { ThreadList } from "@/components/debate/ThreadList"
import { auth } from "@/auth"
import prisma from "@/prisma"
import { notFound } from "next/navigation"

export default async function DebatePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ argId?: string }> }) {
    const session = await auth()
    const { id } = await params
    const { argId } = await searchParams

    const debate = await prisma.debate.findUnique({
        where: { id }
    })

    if (!debate) {
        notFound()
    }

    let currentArgument = null

    // Se recebemos um ID de Argumento na URL, buscamos ELE como nó central atual.
    // Senão, pegamos a Raiz do Banco (Argument cujo parent_id é nulo) para esse debate
    if (argId) {
        currentArgument = await prisma.argument.findUnique({ where: { id: argId } })
    }

    if (!currentArgument) {
        currentArgument = await prisma.argument.findFirst({
            where: {
                debate_id: debate.id,
                parent_id: null
            }
        })
    }

    // Busca das Sub-respostas (Apartes vinculados diretamente a ESTE vídeo principal na tela)
    const apartesFromDB = currentArgument ? await prisma.argument.findMany({
        where: { parent_id: currentArgument.id },
        include: {
            user: true,
            _count: {
                select: { replies: true }
            }
        },
        orderBy: { created_at: 'asc' }
    }) : []

    // Adaptador pros dois componentes (O Relógio do Vídeo e a Lista de Texto)
    const apartes = apartesFromDB.map((a: any) => ({
        id: a.id,
        title: a.title,
        side: a.side,
        created_at: a.created_at,
        target_start: a.target_start || 0,
        target_end: a.target_end || 0,
        author: a.user?.name || "Usuário",
        youtube_id: a.youtube_id || "",
        user: a.user,
        _count: a._count
    }))

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
                    <AuthStatus session={session} />
                </header>

                {/* Hero / O Debate em Destaque (A Moção Central) */}
                <section className="space-y-4 pt-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 transition-colors">
                            Público
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl shadow-sm">
                            {currentArgument?.id === debate.id || !argId ? debate.title : currentArgument?.title}
                        </h2>
                        <p className="text-zinc-400 max-w-2xl leading-relaxed">
                            Assista ao vídeo base. Se discordar (ou concordar) de um ponto específico, passe o mouse e clique no botão superior direito para pedir um <strong>Aparte</strong> na linha do tempo.
                        </p>
                    </div>

                    <div className="mt-8">
                        <InteractivePlayer
                            videoId={currentArgument?.youtube_id || ""}
                            apartes={apartes}
                            debateId={debate.id}
                            parentId={currentArgument?.id || ""}
                        />
                    </div>

                    {/* Renderiza a Thread de Texto Dinâmica */}
                    <ThreadList debateId={debate.id} apartes={apartes} />

                </section>

            </div>
        </main>
    )
}
