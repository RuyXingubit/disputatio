"use client"

import React, { useEffect, useRef, useState } from 'react'
import YouTube, { YouTubeProps } from 'react-youtube'
import { useRouter } from 'next/navigation'
import { usePlayerStore } from '@/store/playerStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { MessageSquareShare } from 'lucide-react'
import { NewAparteModal } from './NewAparteModal'

interface Aparte {
    id: string
    title: string
    target_start: number
    target_end: number
    author: string
    youtube_id?: string | null
    video_url?: string | null
}

interface InteractivePlayerProps {
    videoId?: string | null
    videoUrl?: string | null
    apartes: Aparte[]
    debateId: string
    parentId: string
}

export function InteractivePlayer({ videoId, videoUrl, apartes, debateId, parentId }: InteractivePlayerProps) {
    const { setCurrentTime, setIsPlaying, setDuration, currentTime, isPlaying } = usePlayerStore()
    const playerRef = useRef<any>(null)
    const videoTagRef = useRef<HTMLVideoElement>(null)
    const router = useRouter()

    const [isLoginModalOpen, setLoginModalOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalTargetStart, setModalTargetStart] = useState(0)

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isPlaying && (playerRef.current || videoTagRef.current)) {
            interval = setInterval(async () => {
                // Pega do Ref do Youtube, ou do Ref do HTML5 Video
                const time = playerRef.current
                    ? await playerRef.current.getCurrentTime()
                    : (videoTagRef.current ? videoTagRef.current.currentTime : 0)

                setCurrentTime(time)
            }, 500)
        }
        return () => clearInterval(interval)
    }, [isPlaying, setCurrentTime])

    // --- YT Event Handlers ---
    const onReady: YouTubeProps['onReady'] = (event) => {
        playerRef.current = event.target
        setDuration(event.target.getDuration())
    }

    const onStateChange: YouTubeProps['onStateChange'] = (event) => {
        setIsPlaying(event.data === 1)
    }

    // --- HTML Player Handlers ---
    const onHTML5Play = () => setIsPlaying(true)
    const onHTML5Pause = () => setIsPlaying(false)
    const onHTML5LoadedMetadata = (e: any) => setDuration(e.target.duration)

    const handlePauseBoth = () => {
        playerRef.current?.pauseVideo()
        videoTagRef.current?.pause()
    }


    const activeApartes = apartes.filter(
        (a) => currentTime >= a.target_start && currentTime <= a.target_end
    )

    return (
        <div className="relative w-full max-w-4xl mx-auto rounded-lg overflow-hidden bg-black aspect-video group shadow-xl border border-zinc-800">

            {videoId && (
                <YouTube
                    videoId={videoId}
                    opts={{
                        width: '100%',
                        height: '100%',
                        playerVars: {
                            autoplay: 1, // Auto-play ativado para transição fluida
                            modestbranding: 1,
                            rel: 0,
                        },
                    }}
                    onReady={onReady}
                    onStateChange={onStateChange}
                    className="absolute inset-0 w-full h-full pointer-events-auto"
                    iframeClassName="w-full h-full"
                />
            )}

            {videoUrl && !videoId && (
                <video
                    ref={videoTagRef}
                    src={videoUrl}
                    controls
                    autoPlay
                    onPlay={onHTML5Play}
                    onPause={onHTML5Pause}
                    onLoadedMetadata={onHTML5LoadedMetadata}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-auto bg-black"
                />
            )}

            <AnimatePresence>
                {activeApartes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-16 right-4 flex flex-col gap-2 pointer-events-auto"
                    >
                        {activeApartes.map((aparte) => (
                            <div
                                key={aparte.id}
                                className="bg-black/80 backdrop-blur-md border border-zinc-700/50 p-3 rounded-lg shadow-lg max-w-[280px] flex flex-col gap-2"
                            >
                                <div className="flex items-start gap-2">
                                    <MessageSquareShare className="w-4 h-4 text-orange-400 mt-1 shrink-0" />
                                    <div>
                                        <h4 className="text-zinc-100 text-sm font-semibold leading-tight">
                                            Aparte de {aparte.author}
                                        </h4>
                                        <p className="text-zinc-400 text-xs mt-0.5 line-clamp-2">
                                            {aparte.title}
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full text-xs h-8 bg-white text-black hover:bg-zinc-200"
                                    onClick={() => {
                                        handlePauseBoth()
                                        // Navega para a mesma página, mas com o foco no novo argumento
                                        router.push(`/debate/${debateId}?argId=${aparte.id}`)
                                    }}
                                >
                                    Assistir Resposta
                                </Button>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Botão Global de "Pedir Aparte" (Sempre visível no Hover) */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                <Button
                    variant="default"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 font-semibold shadow-lg"
                    onClick={() => {
                        handlePauseBoth()
                        setModalTargetStart(Math.floor(currentTime))
                        setIsModalOpen(true)
                    }}
                >
                    Pedir Aparte neste trecho
                </Button>
            </div>

            <NewAparteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                targetStart={modalTargetStart}
                debateId={debateId}
                parentId={parentId}
            />
        </div>
    )
}
