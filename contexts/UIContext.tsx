/**
 * UI Context - Global UI State Management
 * 
 * Manages global modal states (InvoicesFullView, ChatWidget, etc.)
 * that need to persist across route changes and be accessible
 * from any component in the app.
 * 
 * This prevents the "modal disappearing" bug by moving state
 * out of individual components and into a persistent context.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Homeowner } from '../types';

interface UIContextValue {
  // Invoices Full View State
  showInvoicesFullView: boolean;
  setShowInvoicesFullView: (show: boolean) => void;
  invoicesPrefillData?: {
    clientName?: string;
    clientEmail?: string;
    projectDetails?: string;
    homeownerId?: string;
  };
  setInvoicesPrefillData: (data?: UIContextValue['invoicesPrefillData']) => void;
  
  // Chat Widget State
  isChatWidgetOpen: boolean;
  setIsChatWidgetOpen: (open: boolean) => void;
  
  // Active Homeowner (for chat context)
  activeHomeowner: Homeowner | null;
  setActiveHomeowner: (homeowner: Homeowner | null) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Invoices modal state
  const [showInvoicesFullView, setShowInvoicesFullView] = useState(false);
  const [invoicesPrefillData, setInvoicesPrefillData] = useState<UIContextValue['invoicesPrefillData']>();
  
  // Chat widget state
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false);
  
  // Active homeowner (for chat context)
  const [activeHomeowner, setActiveHomeowner] = useState<Homeowner | null>(null);
  
  const value: UIContextValue = {
    showInvoicesFullView,
    setShowInvoicesFullView,
    invoicesPrefillData,
    setInvoicesPrefillData,
    isChatWidgetOpen,
    setIsChatWidgetOpen,
    activeHomeowner,
    setActiveHomeowner,
  };
  
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextValue => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
