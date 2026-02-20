"use client"

import { useState } from "react"
import { createAparteAction } from "@/lib/actions/argument"
import { getUploadUrlAction } from "@/lib/actions/upload"
import { Button } from "@/components/ui/Button"
import { motion, AnimatePresence } from "framer-motion"
import { X, Youtube, MonitorPlay, Video } from "lucide-react"
import { VideoRecorder } from "./VideoRecorder"

interface NewAparteModalProps {
    isOpen: boolean
    onClose: () => void
    targetStart: number
    debateId: string
    parentId: string // ID do vídeo que estamos respondendo
}

export function NewAparteModal({ isOpen, onClose, targetStart, debateId, parentId }: NewAparteModalProps) {
    const [loading, setLoading] = useState(false)
    const [uploadType, setUploadType] = useState<'youtube' | 'record'>('youtube')
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            // Append dados vitais de Parent/Tempo
            formData.append("debateId", debateId)
            formData.append("parentId", parentId)
            formData.append("targetStart", targetStart.toString())

            // Lógica Distintiva de Vídeo
            if (uploadType === "record") {
                if (!recordedBlob) {
                    throw new Error("Você precisa gravar um vídeo de resposta.")
                }

                // 1. Pede permissão pro Server Node para colocar arquivo no S3 Minio
                const { data } = await getUploadUrlAction()

                if (!data || !data.uploadUrl) throw new Error("Erro de infraestrutura S3")

                // 2. Transfere os Megabytes do Vídeo pro Objeto S3 diretamente do Browser
                const uploadResponse = await fetch(data.uploadUrl, {
                    method: "PUT",
                    body: recordedBlob,
                    headers: {
                        "Content-Type": "video/webm"
                    }
                })

                if (!uploadResponse.ok) {
                    throw new Error("Falha no upload para o Storage S3.")
                }

                // 3. Comunica nosso Prisma SQL Server que a key está lá na Minio Publica
                formData.append("videoUrl", data.publicUrl)

            } else {
                // Modo Clássico (URL colada do Tube)
                const ytUrl = formData.get("youtubeUrl") as string
                if (!ytUrl) throw new Error("Link do YouTube é obrigatório")
            }

            // Postagem oficial no Postgres da Plataforma Disputatio
            await createAparteAction(formData)
            onClose()
            setUploadType('youtube')
            setRecordedBlob(null)
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
                        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
                            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                                <MonitorPlay className="w-5 h-5 text-red-500" />
                                Pedir Aparte
                            </h2>
                            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Botões Toggle de Modo */}
                            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                                <button
                                    onClick={() => setUploadType('youtube')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${uploadType === 'youtube' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <Youtube className="w-4 h-4" /> Importar do YouTube
                                </button>
                                <button
                                    onClick={() => setUploadType('record')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${uploadType === 'record' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <Video className="w-4 h-4" /> Gravar Agora
                                </button>
                            </div>

                            <form id="aparteForm" action={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                                            Tempo referenciado
                                        </label>
                                        <input
                                            type="text"
                                            disabled
                                            value={`${Math.floor(targetStart / 60)}:${String(Math.floor(targetStart % 60)).padStart(2, '0')}`}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-400 text-sm cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                                            Seu Lado da Moção
                                        </label>
                                        <select
                                            name="side"
                                            required
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                        >
                                            <option value="OPOSICAO">Oposição (Discordo)</option>
                                            <option value="GOVERNO">Governo (Concordo)</option>
                                            <option value="NEUTRO">Neutro (Apenas Fatos)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                                        Título do Argumento
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        required
                                        placeholder="Ex: Refutação aos dados de 2021 apontados"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                    />
                                </div>

                                {/* Seção Dinâmica do Video Input */}
                                {uploadType === 'youtube' ? (
                                    <div className="pt-2 border-t border-zinc-800/50">
                                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                                            Link do YouTube
                                        </label>
                                        <input
                                            type="url"
                                            name="youtubeUrl"
                                            placeholder="https://youtube.com/watch?v=..."
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                        />
                                    </div>
                                ) : (
                                    <div className="pt-2 border-t border-zinc-800/50">
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                                            Seu Rosto de Resposta
                                        </label>
                                        <VideoRecorder
                                            onVideoReady={(blob) => setRecordedBlob(blob)}
                                            onCancel={() => {
                                                setRecordedBlob(null)
                                                setUploadType('youtube')
                                            }}
                                        />
                                        {recordedBlob && (
                                            <p className="text-xs text-green-400 mt-2 font-medium">✓ Gravação de {((recordedBlob.size) / (1024 * 1024)).toFixed(2)} MB anexada ao envio.</p>
                                        )}
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button form="aparteForm" type="submit" variant="default" className="bg-red-600 hover:bg-red-700 w-36" disabled={loading || (uploadType === "record" && !recordedBlob)}>
                                {loading ? "Enviando..." : "Publicar Aparte"}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
