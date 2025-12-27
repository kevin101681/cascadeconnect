import { create } from 'zustand';

interface TaskStore {
  isOpen: boolean;
  activeClaimId: string | null;
  isFilterEnabled: boolean;
  
  openTasks: (claimId?: string) => void;
  closeTasks: () => void;
  toggleFilter: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  isOpen: false,
  activeClaimId: null,
  isFilterEnabled: false,
  
  openTasks: (claimId) => set({
    isOpen: true,
    activeClaimId: claimId || null,
    isFilterEnabled: !!claimId, // Default to true if claimId is provided
  }),
  
  closeTasks: () => set({
    isOpen: false,
    activeClaimId: null,
    isFilterEnabled: false,
  }),
  
  toggleFilter: () => set((state) => ({
    isFilterEnabled: !state.isFilterEnabled,
  })),
}));

