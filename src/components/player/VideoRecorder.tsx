"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/Button"
import { Video, Square, Play, UploadCloud, RefreshCcw, Camera, Upload } from "lucide-react"

interface VideoRecorderProps {
    onVideoReady: (videoBlob: Blob) => void
    onCancel: () => void
}

export function VideoRecorder({ onVideoReady, onCancel }: VideoRecorderProps) {
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [recordedChunks, setRecordedChunks] = useState<BlobPart[]>([])
    const [videoPreview, setVideoPreview] = useState<string | null>(null)
    const [cameraError, setCameraError] = useState<string | null>(null)

    const videoRef = useRef<HTMLVideoElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 1. Pedir permissão e abrir câmera com fallback para hardware fraco/genérico
    const startCamera = useCallback(async () => {
        setCameraError(null)
        try {
            // Tenta 720p Direto primeiro e "Câmera Frontal" caso seja Mobile
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: "user" },
                audio: true
            })
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (err: any) {
            console.warn("Falha no perfil HD (720p). Tentando genérico...", err)
            try {
                // Fallback: Pede Qualquer Resolução (PCs Windows)
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                })
                setStream(fallbackStream)
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream
                }
            } catch (fallbackErr) {
                console.error("Falha drástica ao acessar câmera:", fallbackErr)
                setCameraError("Câmera não encontrada ou acesso negado pelo navegador. Sem problemas! Use a opção de Anexar Arquivo logo abaixo.")
            }
        }
    }, [])

    // Lógica Alternativa (Desktop sem Cam): Upar arquivo de video pesado direto
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Verifica se é tipo video
        if (!file.type.startsWith("video/")) {
            setCameraError("O arquivo enviado não parece ser um formato de vídeo válido (tente .mp4 ou .webm).")
            return
        }

        // Manda o arquivo lido direto pro handler do S3 do component Pai
        onVideoReady(file)
    }

    // 2. Iniciar Gravação
    const startRecording = useCallback(() => {
        if (!stream) return
        setIsRecording(true)

        // Suportar format de webm leve
        const options = { mimeType: "video/webm;codecs=vp9,opus" }
        const mediaRecorder = new MediaRecorder(stream, options)
        mediaRecorderRef.current = mediaRecorder

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                setRecordedChunks((prev) => [...prev, e.data])
            }
        }

        mediaRecorder.onstop = () => {
            // Quando parar, compilar o final do blob
            setIsRecording(false)
        }

        mediaRecorder.start()
    }, [stream])

    // 3. Parar a Gravação e gerar Preview
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            // Tira a câmera da tela pra exibir só o gravado
            if (videoRef.current) {
                videoRef.current.srcObject = null
            }
        }
    }, [isRecording])

    // 4. Salvar Chunks em Blob e dar Preview
    const compileVideo = useCallback(() => {
        if (recordedChunks.length === 0) return
        const blob = new Blob(recordedChunks, { type: "video/webm" })
        const url = URL.createObjectURL(blob)
        setVideoPreview(url)
    }, [recordedChunks])

    if (recordedChunks.length > 0 && !isRecording && !videoPreview) {
        compileVideo()
    }

    // 5. Finalizar Componente ou refazer
    const handleSubmit = () => {
        if (recordedChunks.length === 0) return
        const finalBlob = new Blob(recordedChunks, { type: "video/webm" })
        onVideoReady(finalBlob) // Devolve o binario pro component pai cuidar do S3
    }

    const handleRetake = () => {
        setRecordedChunks([])
        setVideoPreview(null)
        startCamera()
    }

    // Desligar hardware ao sair
    const handleExit = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop())
        }
        onCancel()
    }

    return (
        <div className="flex flex-col gap-4 border border-zinc-800 bg-zinc-950 p-4 rounded-xl">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800">

                {/* Viewfinder da Camera Ativa */}
                {!videoPreview && (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted // Muta o output do mic pra nao dar eco
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                )}

                {/* Player de Preview Pós-Gravação */}
                {videoPreview && (
                    <video
                        src={videoPreview}
                        controls
                        className="w-full h-full object-contain bg-zinc-900"
                    />
                )}

                {/* Overlay Instrução Inicial (Empty State) */}
                {!stream && !videoPreview && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 p-6 text-center z-10">
                        <Camera className={`w-12 h-12 mb-4 ${cameraError ? 'text-red-500' : 'text-zinc-600'}`} />

                        <h4 className="text-zinc-100 font-semibold mb-2 text-lg">Gravação em Nuvem</h4>

                        {cameraError ? (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-md mb-4 max-w-sm">
                                {cameraError}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-400 mb-6 max-w-sm">
                                Grave seu dispositivo agora para responder a este ponto do debate ou anexe um arquivo se já houver preparado.
                            </p>
                        )}

                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <Button type="button" onClick={startCamera} className="bg-red-600 hover:bg-red-700 text-white w-full">
                                {cameraError ? "Tentar Câmera Novamente" : "Permitir Câmera do Dispositivo"}
                            </Button>

                            <div className="flex items-center gap-2">
                                <hr className="w-full border-zinc-800" />
                                <span className="text-xs text-zinc-600 uppercase font-semibold">OU</span>
                                <hr className="w-full border-zinc-800" />
                            </div>

                            <input
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-zinc-700 bg-transparent text-zinc-300 hover:text-white hover:bg-zinc-800"
                            >
                                <Upload className="w-4 h-4 mr-2" /> Anexar Arquivo de Vídeo
                            </Button>
                        </div>
                    </div>
                )}

                {/* Bolinha Vermelha Rec indicator */}
                {isRecording && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-black/50 rounded-full backdrop-blur-md z-20">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-white tracking-widest uppercase">Gravando</span>
                    </div>
                )}
            </div>

            {/* Controles de Câmera */}
            {stream && !videoPreview && (
                <div className="flex justify-center gap-4">
                    {!isRecording ? (
                        <Button type="button" onClick={startRecording} size="lg" className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700 p-0 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                            <span className="w-4 h-4 bg-white rounded-full"></span>
                        </Button>
                    ) : (
                        <Button type="button" onClick={stopRecording} size="lg" className="rounded-full w-14 h-14 bg-zinc-800 hover:bg-zinc-700 p-0 border-2 border-zinc-600">
                            <Square className="w-5 h-5 text-red-500 fill-current" />
                        </Button>
                    )}
                </div>
            )}

            {/* Controles Pós-Gravação (Aprovar/Refazer) */}
            {videoPreview && (
                <div className="flex gap-3 justify-end mt-2 border-t border-zinc-800 pt-4">
                    <Button type="button" variant="outline" onClick={handleRetake} className="flex-1 w-full border-zinc-700 bg-transparent text-zinc-300 hover:text-white hover:bg-zinc-800">
                        <RefreshCcw className="w-4 h-4 mr-2" /> Descartar
                    </Button>
                    <Button type="button" onClick={handleSubmit} className="flex-1 w-full bg-red-600 hover:bg-red-700 text-white">
                        <UploadCloud className="w-4 h-4 mr-2" /> Enviar p/ Nuvem
                    </Button>
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-end mt-2">
                {(!videoPreview || stream) && <Button type="button" variant="ghost" size="sm" onClick={handleExit} className="text-zinc-500 hover:text-zinc-300">Cancelar e Sair</Button>}
            </div>
        </div>
    )
}
