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
    const youtubeUrl = formData.get("youtubeUrl") as string
    const side = formData.get("side") as string // GOVERNO, OPOSICAO, NEUTRO
    const targetStart = parseInt(formData.get("targetStart") as string, 10)
    const title = formData.get("title") as string

    // Extrair o ID do YouTube da URL
    let youtubeId = ""
    try {
        const url = new URL(youtubeUrl)
        if (url.hostname.includes("youtube.com")) {
            youtubeId = url.searchParams.get("v") || ""
        } else if (url.hostname.includes("youtu.be")) {
            youtubeId = url.pathname.slice(1)
        }
    } catch (e) {
        throw new Error("URL do YouTube inválida.")
    }

    if (!youtubeId) {
        throw new Error("URL do YouTube inválida.")
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
            youtube_id: youtubeId,
            video_duration: 60, // Fake duration pro MVP, numa v2 pegaríamos da API do YT real
            target_start: targetStart,
            target_end: targetEnd,
        }
    })

    revalidatePath(`/debate/${debateId}`)
    return { success: true }
}
