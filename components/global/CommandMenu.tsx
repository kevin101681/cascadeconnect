/**
 * Global Command Menu (Command+K)
 * Provides unified search across the application
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { 
  User, ClipboardList, Calendar, MessageCircle, Search, 
  Loader2, X, Building2, Clock
} from 'lucide-react';
import { performGlobalSearch } from '../../services/globalSearch';
import type { SearchResult } from '../../types/search';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

const CommandMenu: React.FC<CommandMenuProps> = ({ isOpen, onClose, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounce search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await performGlobalSearch(searchQuery);
        setResults(response.results);
        setSelectedIndex(0); // Reset selection when results change
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelectResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, onClose]);

  // Handle result selection
  const handleSelectResult = useCallback((result: SearchResult) => {
    if (onNavigate) {
      onNavigate(result.url);
    } else {
      // Fallback: update window location
      window.location.hash = result.url;
    }
    onClose();
    setSearchQuery('');
    setResults([]);
  }, [onNavigate, onClose]);

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      User: <User className="h-4 w-4" />,
      ClipboardList: <ClipboardList className="h-4 w-4" />,
      Calendar: <Calendar className="h-4 w-4" />,
      MessageCircle: <MessageCircle className="h-4 w-4" />,
      Building2: <Building2 className="h-4 w-4" />,
      Clock: <Clock className="h-4 w-4" />,
    };
    return icons[iconName] || <Search className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      homeowner: 'Homeowners',
      claim: 'Claims',
      event: 'Events',
      message: 'Messages',
    };
    return labels[type] || type;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
      />
      
      {/* Dropdown positioned below the header search */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-2xl px-4">
        <div className="bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-5 border border-surface-outline-variant dark:border-gray-700 w-full overflow-hidden animate-[scale-in_0.15s_ease-out]">
        <Command className="rounded-2xl" shouldFilter={false}>
          <div className="flex items-center border-b border-surface-outline-variant dark:border-gray-700 px-4">
            <Search className="h-5 w-5 text-surface-on-variant dark:text-gray-400 mr-3 flex-shrink-0" />
            <Command.Input
              placeholder="Search homeowners, claims, events, messages..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              onKeyDown={handleKeyDown}
              className="flex-1 py-4 text-base bg-transparent border-none outline-none text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setResults([]);
                }}
                className="p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
              </button>
            )}
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-3 text-sm text-surface-on-variant dark:text-gray-400">Searching...</span>
              </div>
            )}

            {!isLoading && searchQuery.trim().length < 2 && (
              <div className="py-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-surface-outline dark:text-gray-600" />
                <p className="text-sm text-surface-on-variant dark:text-gray-400">
                  Type at least 2 characters to search
                </p>
              </div>
            )}

            {!isLoading && searchQuery.trim().length >= 2 && results.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-surface-on-variant dark:text-gray-400">
                  No results found for "{searchQuery}"
                </p>
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <>
                {Object.entries(groupedResults).map(([type, typeResults]) => (
                  <div key={type} className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-surface-on-variant dark:text-gray-400 uppercase tracking-wide">
                      {getTypeLabel(type)}
                    </div>
                    <Command.Group>
                      {typeResults.map((result, index) => {
                        const globalIndex = results.indexOf(result);
                        const isSelected = globalIndex === selectedIndex;
                        
                        return (
                          <Command.Item
                            key={result.id}
                            value={result.id}
                            onSelect={() => handleSelectResult(result)}
                            className={`
                              flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                              ${isSelected 
                                ? 'bg-primary-container/20 dark:bg-primary/20 text-primary dark:text-primary' 
                                : 'hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on dark:text-gray-100'
                              }
                            `}
                          >
                            <div className={`flex-shrink-0 ${isSelected ? 'text-primary dark:text-primary' : 'text-surface-on-variant dark:text-gray-400'}`}>
                              {getIcon(result.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium truncate ${isSelected ? 'text-primary dark:text-primary' : ''}`}>
                                {result.title}
                              </div>
                              <div className="text-xs text-surface-on-variant dark:text-gray-400 truncate">
                                {result.subtitle}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="text-xs text-primary dark:text-primary font-medium">
                                Enter
                              </div>
                            )}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  </div>
                ))}
              </>
            )}
          </Command.List>

          {results.length > 0 && (
            <div className="border-t border-surface-outline-variant dark:border-gray-700 px-4 py-2 text-xs text-surface-on-variant dark:text-gray-400">
              {results.length} result{results.length !== 1 ? 's' : ''} • Use ↑↓ to navigate • Enter to select • Esc to close
            </div>
          )}
        </Command>
        </div>
      </div>
    </>
  );
};

export default CommandMenu;

