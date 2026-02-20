"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createDebateAction } from "@/lib/actions/debate"
import { getUploadUrlAction } from "@/lib/actions/upload"
import { Button } from "@/components/ui/Button"
import { X, Youtube, MonitorPlay, Video } from "lucide-react"
import { VideoRecorder } from "../player/VideoRecorder" // Alterado caminho para buscar de player/

export function NewDebateModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    const [uploadType, setUploadType] = useState<'youtube' | 'record'>('youtube')
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setErrorMsg("")

        const formData = new FormData(e.currentTarget)

        try {
            // Nova Lógica Multi-Fonte (S3 WebRTC Upload vs Raw Form)
            if (uploadType === "record") {
                if (!recordedBlob) {
                    throw new Error("Você precisa gravar um vídeo da moção.")
                }

                // 1. Pede permissão e Key de acesso temporária para a Nuvem MinIO Privada
                const { data } = await getUploadUrlAction()

                if (!data || !data.uploadUrl) throw new Error("Erro na infraestrutura da plataforma.")

                // 2. Sobindo a mídia pesada para o servidor Bucket longe do NextJS
                const uploadResponse = await fetch(data.uploadUrl, {
                    method: "PUT",
                    body: recordedBlob,
                    headers: {
                        "Content-Type": "video/webm"
                    }
                })

                if (!uploadResponse.ok) {
                    throw new Error("Falha no upload para o servidor de arquivos.")
                }

                // 3. Cadastra no Banco apenas a URL da Nuvem Publica.
                formData.append("videoUrl", data.publicUrl)

            } else {
                // Modo Clássico (URL colada do Tube)
                const ytUrl = formData.get("youtubeUrl") as string
                if (!ytUrl) throw new Error("Link do YouTube é obrigatório")
            }

            // Manda Action final
            await createDebateAction(formData)
            // Redirect acontece dentro da action no Backend!

        } catch (e: any) {
            setErrorMsg(e.message || "Ocorreu um erro ao criar a moção.")
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <MonitorPlay className="w-5 h-5 text-red-500" />
                    Iniciar Nova Moção
                </h2>
                <p className="text-zinc-400 text-sm mb-6">Comece um novo ciclo de debates gravando diretamente da sua webcam ou importando uma tese já existente no YouTube.</p>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-md mb-4 text-center font-medium">
                        {errorMsg}
                    </div>
                )}

                {/* Botões Toggle de Modo */}
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 mb-6">
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Título da Moção</label>
                        <input
                            type="text"
                            name="title"
                            required
                            placeholder="Ex: O desenvolvimento remoto afeta a produtividade?"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white placeholder-zinc-700 focus:ring-1 focus:ring-red-500 outline-none"
                        />
                    </div>

                    {uploadType === 'youtube' ? (
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-zinc-300 mb-1">Link do YouTube Base</label>
                            <input
                                type="url"
                                name="youtubeUrl"
                                placeholder="https://youtube.com/watch?v=..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white placeholder-zinc-700 focus:ring-1 focus:ring-red-500 outline-none"
                            />
                        </div>
                    ) : (
                        <div className="pt-2 border-t border-zinc-800/50">
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Gravar em Vídeo (Limpe o Fundo)
                            </label>
                            <VideoRecorder
                                onVideoReady={(blob) => setRecordedBlob(blob)}
                                onCancel={() => {
                                    setRecordedBlob(null)
                                    setUploadType('youtube')
                                }}
                            />
                            {recordedBlob && (
                                <p className="text-xs text-green-400 mt-2 font-medium">✓ Gravação da Tese ({((recordedBlob.size) / (1024 * 1024)).toFixed(2)} MB) anexada ao envio com sucesso.</p>
                            )}
                        </div>
                    )}

                    <div className="pt-6 flex justify-end gap-3 border-t border-zinc-800 mt-6">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="default" className="bg-red-600 hover:bg-red-700 w-44" disabled={loading || (uploadType === "record" && !recordedBlob)}>
                            {loading ? "Criando Fórum..." : "Publicar Moção"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
