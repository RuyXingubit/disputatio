"use server"

import { auth } from "@/auth"
import prisma from "@/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createDebateAction(formData: FormData) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Você precisa estar logado para iniciar um debate.")
    }

    const title = formData.get("title") as string
    const youtubeUrl = formData.get("youtubeUrl") as string | null
    const videoUrl = formData.get("videoUrl") as string | null

    if (!title) {
        throw new Error("Preencha o título da moção.")
    }

    let finalYoutubeId: string | null = null
    let finalVideoUrl: string | null = null

    // Caso A: Usou vídeo nativo gravado pela webcam
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
        throw new Error("É necessário fornecer a Tese em Vídeo (Link do YouTube ou Gravação).")
    }

    let debateId = ""

    // Transaction para garantir atomicidade: Cria o Debate E a Moção Raiz juntos
    await prisma.$transaction(async (tx) => {
        const debate = await tx.debate.create({
            data: {
                title: title,
                creator_id: session.user?.id as string
            }
        })

        await tx.argument.create({
            data: {
                debate_id: debate.id,
                user_id: session.user?.id as string,
                side: "NEUTRO", // A moção inicial não tem lado, é a tese
                title: "Moção Principal",
                youtube_id: finalYoutubeId || null,
                video_url: finalVideoUrl || null,
                video_duration: 300, // Fake MVP
                target_start: 0,
                target_end: 300 // Todo o vídeo
            }
        })

        debateId = debate.id
    })

    revalidatePath("/")
    redirect(`/debate/${debateId}`)
}
