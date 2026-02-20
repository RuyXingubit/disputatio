"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Plus } from "lucide-react"
import { NewDebateModal } from "./NewDebateModal"

export function CreateDebateButton() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-2 shadow-lg"
            >
                <Plus className="w-4 h-4" />
                Nova Moção
            </Button>

            <NewDebateModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    )
}
