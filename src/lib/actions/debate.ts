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
    const youtubeUrl = formData.get("youtubeUrl") as string

    if (!title || !youtubeUrl) {
        throw new Error("Preencha o título da moção e o link do YouTube.")
    }

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
                youtube_id: youtubeId,
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
