"use server"

import { prisma } from "@/prisma"
import bcrypt from "bcryptjs"
import { signIn } from "@/auth"

export async function registerUserAction(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password || !name) {
        throw new Error("Todos os campos são obrigatórios.")
    }

    // Verifica se o email já existe
    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        throw new Error("Este e-mail já está em uso.")
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Criação
    await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword
        }
    })

    // Retorna sucesso para o form de frontend decidir o que fazer (ex: auto-login)
    return { success: true }
}
