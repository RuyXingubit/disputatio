import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"

// Cliente central da AWS S3 - Apontado via ENV pro nosso Minio Local
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    // No minio, forcePathStyle é OBRIGATÓRIO (urls como url/bucket/key em vez de bucket.url/key)
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "disputatio_admin",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "disputatio_s3_secret",
    },
})

// Função para gerar Presigned URL de UPLOAD SEGURO (O Browser sobe o peso direto pro S3 por 15 minutos)
export async function getUploadUrl(contentType: string = "video/webm") {
    const fileExtension = contentType === "video/webm" ? "webm" : "mp4"
    // FileKey único na plataforma
    const fileKey = `debates/${uuidv4()}.${fileExtension}`

    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || "disputatio-videos",
        Key: fileKey,
        ContentType: contentType,
    })

    // Assina URL com validade de 15 minutos (900 segs)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })

    return {
        uploadUrl,
        fileKey,
        // Devolve a URL final e pública para gravar no Prisma dps q subir
        publicUrl: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${fileKey}`
    }
}
