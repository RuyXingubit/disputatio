"use client"

import { useState } from "react"
import { createAparteAction } from "@/lib/actions/argument"
import { Button } from "@/components/ui/Button"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface NewAparteModalProps {
    isOpen: boolean
    onClose: () => void
    targetStart: number
    debateId: string
    parentId: string // ID do vídeo que estamos respondendo
}

export function NewAparteModal({ isOpen, onClose, targetStart, debateId, parentId }: NewAparteModalProps) {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            formData.append("debateId", debateId)
            formData.append("parentId", parentId)
            formData.append("targetStart", targetStart.toString())

            await createAparteAction(formData)
            onClose() // Sucesso, fecha o modal
        } catch (e: any) {
            alert(e.message || "Erro ao criar o aparte.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                            <h2 className="text-lg font-bold text-zinc-100">Pedir Aparte</h2>
                            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form action={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">
                                    Tempo alvo
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    value={`${Math.floor(targetStart / 60)}:${String(Math.floor(targetStart % 60)).padStart(2, '0')}`}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-400 text-sm cursor-not-allowed"
                                />
                                <p className="text-xs text-zinc-500 mt-1">Sua réplica será conectada a este exato momento do vídeo atual.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">
                                    Título / Resumo do seu argumento
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    placeholder="Ex: Essa estatística ignora a inflação."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">
                                    Seu Lado (Posicionamento)
                                </label>
                                <select
                                    name="side"
                                    required
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                >
                                    <option value="OPOSICAO">Oposição (Discordo)</option>
                                    <option value="GOVERNO">Governo (Corroboro/Concordo)</option>
                                    <option value="NEUTRO">Neutro (Apenas Contexto)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">
                                    Link do seu Vídeo Resposta (YouTube)
                                </label>
                                <input
                                    type="url"
                                    name="youtubeUrl"
                                    required
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="ghost" onClick={onClose}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="default" className="bg-red-600 hover:bg-red-700" disabled={loading}>
                                    {loading ? "Enviando..." : "Publicar Réplica"}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
