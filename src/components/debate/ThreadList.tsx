import { MessageSquareShare } from "lucide-react"
import Link from "next/link"
import { UpvoteButton } from "./UpvoteButton"

interface ArgumentNode {
    id: string
    title: string
    side: string
    created_at: Date
    upvotes: number
    hasVotedIni: boolean
    user: {
        id: string
        name: string | null
    }
    _count: {
        replies: number
    }
}

interface ThreadListProps {
    debateId: string
    apartes: ArgumentNode[]
    currentUserId: string | null
}

function SideBadge({ side }: { side: string }) {
    if (side === "GOVERNO") {
        return <span className="inline-flex items-center rounded-sm bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">A Favor</span>
    }
    if (side === "OPOSICAO") {
        return <span className="inline-flex items-center rounded-sm bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500 border border-red-500/20">Contra</span>
    }
    return <span className="inline-flex items-center rounded-sm bg-zinc-500/10 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-500/20">Neutro</span>
}

export function ThreadList({ debateId, apartes, currentUserId }: ThreadListProps) {
    if (!apartes || apartes.length === 0) {
        return (
            <div className="mt-8 pt-8 border-t border-zinc-900 text-center">
                <p className="text-zinc-500 text-sm">Nenhum aparte registrado para este trecho ainda.</p>
            </div>
        )
    }

    return (
        <div className="mt-8 pt-8 border-t border-zinc-900">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <MessageSquareShare className="w-5 h-5 text-red-500" />
                Histórico de Apartes ({apartes.length})
            </h3>

            <div className="space-y-4">
                {apartes.map((aparte) => (
                    <div key={aparte.id} className="relative pl-6 before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-zinc-800">
                        <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-zinc-950 border-2 border-zinc-700 z-10" />

                        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 transition-colors group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-zinc-200">
                                        {aparte.user.name || "Usuário"}
                                    </span>
                                    <SideBadge side={aparte.side} />
                                    <span className="text-xs text-zinc-600">
                                        {new Date(aparte.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>

                            <p className="text-zinc-300 text-base leading-relaxed mb-4">
                                {aparte.title}
                            </p>

                            <div className="flex items-center gap-4">

                                {currentUserId && (
                                    <UpvoteButton
                                        argumentId={aparte.id}
                                        debateId={debateId}
                                        initialUpvotes={aparte.upvotes}
                                        hasVotedIni={aparte.hasVotedIni}
                                        isAuthor={aparte.user.id === currentUserId}
                                    />
                                )}

                                <Link
                                    href={`/debate/${debateId}?argId=${aparte.id}`}
                                    className="text-xs font-medium text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1.5 ml-auto"
                                >
                                    <MessageSquareShare className="w-3.5 h-3.5" />
                                    Assistir & Ver Respostas ({aparte._count?.replies || 0})
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
