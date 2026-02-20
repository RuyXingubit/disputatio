"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createDebateAction } from "@/lib/actions/debate"
import { Button } from "@/components/ui/Button"
import { X, Plus } from "lucide-react"

export function NewDebateModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setErrorMsg("")

        const formData = new FormData(e.currentTarget)

        try {
            await createDebateAction(formData)
            // O redirect da action se encarrega
        } catch (e: any) {
            setErrorMsg(e.message || "Ocorreu um erro ao criar o debate.")
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-2">Iniciar Nova Moção</h2>
                <p className="text-zinc-400 text-sm mb-6">Comece um novo ciclo de debates. A moção principal (tese) deve ser sustentada por um vídeo do YouTube.</p>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-md mb-4 text-center">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Título da Moção</label>
                        <input
                            type="text"
                            name="title"
                            required
                            placeholder="Ex: O desenvolvimento remoto afeta a produtividade?"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white placeholder-zinc-700"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Link do YouTube Base (Tese Principal)</label>
                        <input
                            type="url"
                            name="youtubeUrl"
                            required
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white placeholder-zinc-700"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Criando..." : "Publicar Moção"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
