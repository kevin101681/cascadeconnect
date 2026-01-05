import { create } from 'zustand';

interface TaskStore {
  isOpen: boolean;
  activeClaimId: string | null;
  isFilterEnabled: boolean;
  contextLabel: string | null; // Label for the note context (e.g., "Claim: Title • Claim #123 • Project" or "Message: Subject • Project")
  contextType: 'claim' | 'message' | 'call' | null; // Type of context for proper display
  prefilledNoteBody: string | null; // Pre-filled text for the note body
  
  openTasks: (claimId?: string, contextLabel?: string, contextType?: 'claim' | 'message' | 'call', prefilledNoteBody?: string) => void;
  closeTasks: () => void;
  toggleFilter: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  isOpen: false,
  activeClaimId: null,
  isFilterEnabled: false,
  contextLabel: null,
  contextType: null,
  prefilledNoteBody: null,
  
  openTasks: (claimId, contextLabel, contextType, prefilledNoteBody) => set({
    isOpen: true,
    activeClaimId: claimId || null,
    isFilterEnabled: false, // Always false - show all notes globally
    contextLabel: contextLabel || null,
    contextType: contextType || null,
    prefilledNoteBody: prefilledNoteBody || null,
  }),
  
  closeTasks: () => set({
    isOpen: false,
    activeClaimId: null,
    isFilterEnabled: false,
    contextLabel: null,
    contextType: null,
    prefilledNoteBody: null,
  }),
  
  toggleFilter: () => set((state) => ({
    isFilterEnabled: !state.isFilterEnabled,
  })),
}));

