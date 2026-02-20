"use server"

import { auth } from "@/auth"
import prisma from "@/prisma"
import { revalidatePath } from "next/cache"

export async function toggleVoteAction(argumentId: string, debateId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Você precisa estar logado para avaliar argumentos.")
    }

    const userId = session.user.id

    // 1. O usuário não pode votar no próprio argumento
    const targetArgument = await prisma.argument.findUnique({
        where: { id: argumentId },
        select: { user_id: true }
    })

    if (!targetArgument) throw new Error("Argumento inexistente.")
    if (targetArgument.user_id === userId) {
        throw new Error("Não é possível votar no seu próprio argumento.")
    }

    // 2. Verificar se o voto já existe
    const existingVote = await prisma.argumentVote.findUnique({
        where: {
            user_id_argument_id: {
                user_id: userId,
                argument_id: argumentId
            }
        }
    })

    // Transação para manter sincronia
    await prisma.$transaction(async (tx) => {
        if (existingVote) {
            // RETIRAR VOTO: Deletar pivot, decrementar upvotes e decrementar ELO do Autor (-5)
            await tx.argumentVote.delete({
                where: {
                    user_id_argument_id: { user_id: userId, argument_id: argumentId }
                }
            })
            await tx.argument.update({
                where: { id: argumentId },
                data: { upvotes: { decrement: 1 } }
            })
            await tx.user.update({
                where: { id: targetArgument.user_id },
                data: { elo_rating: { decrement: 5 } }
            })
        } else {
            // ADICIONAR VOTO: Criar pivot, incrementar upvotes e adicionar ELO ao Autor (+5)
            await tx.argumentVote.create({
                data: {
                    user_id: userId,
                    argument_id: argumentId
                }
            })
            await tx.argument.update({
                where: { id: argumentId },
                data: { upvotes: { increment: 1 } }
            })
            await tx.user.update({
                where: { id: targetArgument.user_id },
                data: { elo_rating: { increment: 5 } }
            })
        }
    })

    revalidatePath(`/debate/${debateId}`)
    return { success: true }
}
