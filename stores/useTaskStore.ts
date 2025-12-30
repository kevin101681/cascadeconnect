import { create } from 'zustand';

interface TaskStore {
  isOpen: boolean;
  activeClaimId: string | null;
  isFilterEnabled: boolean;
  contextLabel: string | null; // Label for the note context (e.g., "Claim: Title • Claim #123 • Project" or "Message: Subject • Project")
  contextType: 'claim' | 'message' | null; // Type of context for proper display
  
  openTasks: (claimId?: string, contextLabel?: string, contextType?: 'claim' | 'message') => void;
  closeTasks: () => void;
  toggleFilter: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  isOpen: false,
  activeClaimId: null,
  isFilterEnabled: false,
  contextLabel: null,
  contextType: null,
  
  openTasks: (claimId, contextLabel, contextType) => set({
    isOpen: true,
    activeClaimId: claimId || null,
    isFilterEnabled: false, // Always false - show all notes globally
    contextLabel: contextLabel || null,
    contextType: contextType || null,
  }),
  
  closeTasks: () => set({
    isOpen: false,
    activeClaimId: null,
    isFilterEnabled: false,
    contextLabel: null,
    contextType: null,
  }),
  
  toggleFilter: () => set((state) => ({
    isFilterEnabled: !state.isFilterEnabled,
  })),
}));

