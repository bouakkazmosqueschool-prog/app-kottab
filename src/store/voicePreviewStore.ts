import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VoicePreviewState {
  visible: boolean;
  position: { x: number; y: number } | null;
  setVisible: (visible: boolean) => void;
  setPosition: (position: VoicePreviewState['position']) => void;
}

export const useVoicePreviewStore = create<VoicePreviewState>()(
  persist(
    (set) => ({
      visible: true,
      position: null,
      setVisible: (visible) => set({ visible }),
      setPosition: (position) => set({ position }),
    }),
    { name: 'kottab-voice-preview-v1', partialize: ({ visible, position }) => ({ visible, position }) },
  ),
);
