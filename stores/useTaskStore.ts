import { create } from 'zustand';

interface TaskStore {
  isOpen: boolean;
  activeClaimId: string | null;
  isFilterEnabled: boolean;
  contextLabel: string | null; // Label for the note context (e.g., "Message: Subject" or "Project: Name")
  
  openTasks: (claimId?: string, contextLabel?: string) => void;
  closeTasks: () => void;
  toggleFilter: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  isOpen: false,
  activeClaimId: null,
  isFilterEnabled: false,
  contextLabel: null,
  
  openTasks: (claimId, contextLabel) => set({
    isOpen: true,
    activeClaimId: claimId || null,
    isFilterEnabled: !!claimId, // Default to true if claimId is provided
    contextLabel: contextLabel || null,
  }),
  
  closeTasks: () => set({
    isOpen: false,
    activeClaimId: null,
    isFilterEnabled: false,
    contextLabel: null,
  }),
  
  toggleFilter: () => set((state) => ({
    isFilterEnabled: !state.isFilterEnabled,
  })),
}));

