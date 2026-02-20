"use server"

import { auth } from "@/auth"
import { getUploadUrl } from "../s3"

export async function getUploadUrlAction() {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Você precisa estar logado para gravar vídeos.")
    }

    try {
        // Pedimos uma presigned URL para upload the video webRTC (.webm)
        const s3Data = await getUploadUrl("video/webm")
        return { success: true, data: s3Data }
    } catch (error) {
        console.error("S3 Upload Error:", error)
        throw new Error("Falha ao se comunicar com o Storage. Tente novamente.")
    }
}
