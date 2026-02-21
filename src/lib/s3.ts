const GATEWAY_URL = process.env.GATEWAY_URL || "https://video.disputatio.com.br"

export async function getUploadUrl(contentType: string = "video/webm") {
    const res = await fetch(`${GATEWAY_URL}/api/gateway/upload-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType }),
    })

    if (!res.ok) {
        throw new Error(`Gateway error: ${res.status}`)
    }

    const data = await res.json()

    return {
        uploadUrl: data.uploadUrl,
        fileKey: data.fileKey,
        publicUrl: `${GATEWAY_URL}${data.resolveUrl}`,
    }
}
