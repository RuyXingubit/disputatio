"use client"

import { useState, useTransition } from "react"
import { toggleVoteAction } from "@/lib/actions/vote"
import { Flame } from "lucide-react"

interface UpvoteButtonProps {
    argumentId: string
    debateId: string
    initialUpvotes: number
    hasVotedIni: boolean
    isAuthor: boolean
}

export function UpvoteButton({ argumentId, debateId, initialUpvotes, hasVotedIni, isAuthor }: UpvoteButtonProps) {
    const [upvotes, setUpvotes] = useState(initialUpvotes)
    const [hasVoted, setHasVoted] = useState(hasVotedIni)
    const [isPending, startTransition] = useTransition()

    async function handleVote() {
        if (isAuthor) return // Botão será desabilitado via style, mas bloqueia na function também

        // Optimistic UI update
        const newHasVoted = !hasVoted
        setHasVoted(newHasVoted)
        setUpvotes(prev => newHasVoted ? prev + 1 : prev - 1)

        // Ação Real no Fundo
        startTransition(async () => {
            try {
                await toggleVoteAction(argumentId, debateId)
            } catch (error) {
                // Revert on fail
                setHasVoted(hasVoted)
                setUpvotes(initialUpvotes)
                alert("Erro ao computar voto. Tente novamente.")
            }
        })
    }

    const disabled = isPending || isAuthor

    return (
        <button
            onClick={handleVote}
            disabled={disabled}
            className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
        ${isAuthor
                    ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50"
                    : hasVoted
                        ? "bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                        : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }
      `}
            title={isAuthor ? "Você não pode votar em seus próprios argumentos" : "Apoiar este argumento"}
        >
            <Flame className={`w-4 h-4 ${hasVoted ? 'fill-orange-400' : ''} ${isPending ? 'animate-pulse' : ''}`} />
            <span>{upvotes}</span>
        </button>
    )
}
