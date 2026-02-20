import { create } from 'zustand'

interface PlayerState {
    currentTime: number
    isPlaying: boolean
    duration: number

    // Ações
    setCurrentTime: (time: number) => void
    setIsPlaying: (playing: boolean) => void
    setDuration: (duration: number) => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
    currentTime: 0,
    isPlaying: false,
    duration: 0,

    setCurrentTime: (time) => set({ currentTime: time }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setDuration: (duration) => set({ duration }),
}))
