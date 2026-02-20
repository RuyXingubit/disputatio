"use server"

import { auth } from "@/auth"
import prisma from "@/prisma"
import { revalidatePath } from "next/cache"

export async function createAparteAction(formData: FormData) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Você precisa estar logado para pedir um aparte.")
    }

    const debateId = formData.get("debateId") as string
    const parentId = formData.get("parentId") as string
    const youtubeUrl = formData.get("youtubeUrl") as string | null
    const videoUrl = formData.get("videoUrl") as string | null
    const side = formData.get("side") as string // GOVERNO, OPOSICAO, NEUTRO
    const targetStart = parseInt(formData.get("targetStart") as string, 10)
    const title = formData.get("title") as string

    let finalYoutubeId: string | null = null
    let finalVideoUrl: string | null = null

    // Caso A: Usou vídeo nativo gravado pela webcam (Storage Local)
    if (videoUrl) {
        finalVideoUrl = videoUrl
    }
    // Caso B: Colou o link do Youtube
    else if (youtubeUrl) {
        try {
            const url = new URL(youtubeUrl)
            if (url.hostname.includes("youtube.com")) {
                finalYoutubeId = url.searchParams.get("v") || null
            } else if (url.hostname.includes("youtu.be")) {
                finalYoutubeId = url.pathname.slice(1)
            }
        } catch (e) {
            throw new Error("URL do YouTube inválida.")
        }
    }

    if (!finalYoutubeId && !finalVideoUrl) {
        throw new Error("É necessário fornecer um vídeo de resposta (Link do YouTube ou Gravação).")
    }

    // Define um target_end temporário como +30s apenas pro MVP
    const targetEnd = targetStart + 30

    await prisma.argument.create({
        data: {
            debate_id: debateId,
            parent_id: parentId,
            user_id: session.user?.id as string,
            side: side,
            title: title,
            youtube_id: finalYoutubeId || undefined,
            video_url: finalVideoUrl || undefined,
            video_duration: 60, // Fake duration pro MVP, numa v2 analisaríamos via FFprobe
            target_start: targetStart,
            target_end: targetEnd,
        }
    })

    revalidatePath(`/debate/${debateId}`)
    return { success: true }
}
