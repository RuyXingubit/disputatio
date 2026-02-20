"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { registerUserAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/Button"
import { X } from "lucide-react"

export function LoginFormModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [isRegister, setIsRegister] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setErrorMsg("")

        const formData = new FormData(e.currentTarget)

        try {
            if (isRegister) {
                // Fluxo de Cadastro
                await registerUserAction(formData)
                // Se deu sucesso o cadastro, já loga automaticamente
                const res = await signIn("credentials", {
                    email: formData.get("email"),
                    password: formData.get("password"),
                    redirect: false
                })

                if (res?.error) {
                    setErrorMsg("Cadastro funcionou, mas falhou ao logar.")
                } else {
                    window.location.reload()
                }
            } else {
                // Fluxo de Login puro
                const res = await signIn("credentials", {
                    email: formData.get("email"),
                    password: formData.get("password"),
                    redirect: false,
                })

                if (res?.error) {
                    setErrorMsg("Login inválido. Verifique suas credenciais.")
                } else {
                    window.location.reload()
                }
            }
        } catch (e: any) {
            setErrorMsg(e.message || "Ocorreu um erro no servidor.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">
                    {isRegister ? "Criar Conta" : "Fazer Login"}
                </h2>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-md mb-4 text-center">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">Nome</label>
                            <input type="text" name="name" required className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white" />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">E-mail</label>
                        <input type="email" name="email" required className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Senha</label>
                        <input type="password" name="password" required className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white" />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Aguarde..." : (isRegister ? "Cadastrar" : "Entrar")}
                    </Button>
                </form>

                <div className="mt-4 text-center text-sm text-zinc-400">
                    {isRegister ? "Já possui conta?" : "Ainda não tem conta?"}{" "}
                    <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-white underline hover:text-red-400">
                        {isRegister ? "Fazer Login" : "Cadastre-se"}
                    </button>
                </div>
            </div>
        </div>
    )
}
