"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/Button"
import { LoginFormModal } from "./LoginFormModal"

export function AuthStatus({ session }: { session: any }) {
    const [isLoginModalOpen, setLoginModalOpen] = useState(false)

    if (session?.user) {
        return (
            <div className="flex items-center gap-4 border-l border-zinc-800 pl-4 ml-4">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{session.user.name}</span>
                        {session.user.elo_rating !== undefined && (
                            <span className="inline-flex items-center rounded-sm bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-400 border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                                ⚔️ {session.user.elo_rating} Elo
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-zinc-500">{session.user.email}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                    Sair
                </Button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-4 border-l border-zinc-800 pl-4 ml-4">
            <Button variant="outline" size="sm" onClick={() => setLoginModalOpen(true)}>
                Login / Cadastrar
            </Button>

            <LoginFormModal
                isOpen={isLoginModalOpen}
                onClose={() => setLoginModalOpen(false)}
            />
        </div>
    )
}
