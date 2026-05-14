import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AiInteraction {
  id: string;
  bookId: string;
  bookTitle: string;
  question: string;
  answer?: string; // Optional initially if the user hasn't answered yet
  createdAt: number;
  answeredAt?: number;
}

interface AiState {
  apiKey: string | null;
  interactions: AiInteraction[];
  setApiKey: (key: string) => void;
  saveQuestion: (bookId: string, bookTitle: string, question: string) => string;
  saveAnswer: (interactionId: string, answer: string) => void;
  deleteInteraction: (id: string) => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      apiKey: null,
      interactions: [],
      setApiKey: (apiKey) => set({ apiKey }),
      saveQuestion: (bookId, bookTitle, question) => {
        const id = Date.now().toString();
        set((state) => ({
          interactions: [
            {
              id,
              bookId,
              bookTitle,
              question,
              createdAt: Date.now(),
            },
            ...state.interactions
          ]
        }));
        return id;
      },
      saveAnswer: (interactionId, answer) => set((state) => ({
        interactions: state.interactions.map((interaction) => 
          interaction.id === interactionId 
            ? { ...interaction, answer, answeredAt: Date.now() } 
            : interaction
        )
      })),
      deleteInteraction: (id) => set((state) => ({
        interactions: state.interactions.filter((i) => i.id !== id)
      })),
    }),
    {
      name: 'maniker-ai-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
