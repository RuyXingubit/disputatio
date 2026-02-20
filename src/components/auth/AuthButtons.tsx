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
                    <span className="text-sm font-semibold text-white">{session.user.name}</span>
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
