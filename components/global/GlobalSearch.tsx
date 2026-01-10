/**
 * Global Search (Inline Dropdown)
 * - CMDK <Command> wrapper (no Dialog/portal)
 * - Results list is absolutely positioned under the input (combobox style)
 * - Opens on focus/click; closes on outside click or Escape
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Command } from 'cmdk';
import { Building2, Calendar, ClipboardList, Clock, Loader2, MessageCircle, Search, User, X } from 'lucide-react';
import { performGlobalSearch } from '../../services/globalSearch';
import type { SearchResult } from '../../types/search';

export interface GlobalSearchProps {
  onNavigate: (url: string) => void;
  placeholder?: string;
  className?: string;
  minChars?: number;
}

const OPEN_EVENT = 'cascade:global-search-open';

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onNavigate,
  placeholder = 'Global Search',
  className,
  minChars = 2,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Open/focus when Cmd/Ctrl+K fires (dispatched by App)
  useEffect(() => {
    const onOpen = () => {
      console.log('🔍 GlobalSearch: Received open event');
      setIsOpen(true);
      // Defer to ensure input is mounted
      window.requestAnimationFrame(() => {
        console.log('🔍 GlobalSearch: Focusing input');
        inputRef.current?.focus();
      });
    };
    console.log('🎧 GlobalSearch: Listening for', OPEN_EVENT);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      console.log('🔇 GlobalSearch: Removed event listener');
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < minChars) {
      setResults([]);
      setIsLoading(false);
      setSelectedIndex(0);
      return;
    }

    setIsLoading(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await performGlobalSearch(q);
        setResults(response.results);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Global search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery, minChars]);

  const groupedResults = useMemo(() => {
    return results.reduce((acc, result) => {
      (acc[result.type] ||= []).push(result);
      return acc;
    }, {} as Record<string, SearchResult[]>);
  }, [results]);

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

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      onNavigate(result.url);
      setIsOpen(false);
      setSearchQuery('');
      setResults([]);
    },
    [onNavigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    },
    [results, selectedIndex, handleSelectResult]
  );

  const showDropdown = isOpen;
  const trimmed = searchQuery.trim();

  return (
    <div ref={rootRef} className={className}>
      <Command className="relative" shouldFilter={false}>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-400"
            style={{ top: '50%', transform: 'translateY(-50%)' }}
          />
          <Command.Input
            ref={(el) => {
              inputRef.current = el;
            }}
            value={searchQuery}
            onValueChange={(v) => {
              setSearchQuery(v);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-surface-container dark:bg-gray-700 rounded-full pl-9 pr-8 py-2 text-sm border-none focus:ring-2 focus:ring-primary focus:outline-none text-surface-on dark:text-gray-100 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setResults([]);
                setSelectedIndex(0);
                window.requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-surface-container-high dark:hover:bg-gray-600 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-surface-on-variant dark:text-gray-300" />
            </button>
          )}
        </div>

        {showDropdown && (
          <div
            className="absolute left-0 right-0 top-full mt-2 z-[60]"
            // Keep focus on the input when interacting with results (prevents blur-close flicker)
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-5 border border-surface-outline-variant dark:border-gray-700 w-full overflow-hidden">
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-3 text-sm text-surface-on-variant dark:text-gray-400">Searching...</span>
                  </div>
                )}

                {!isLoading && trimmed.length < minChars && (
                  <div className="py-8 text-center">
                    <Search className="h-12 w-12 mx-auto mb-4 text-surface-outline dark:text-gray-600" />
                    <p className="text-sm text-surface-on-variant dark:text-gray-400">
                      Type at least {minChars} character{minChars !== 1 ? 's' : ''} to search
                    </p>
                  </div>
                )}

                {!isLoading && trimmed.length >= minChars && results.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-surface-on-variant dark:text-gray-400">
                      No results found for "{trimmed}"
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
                          {typeResults.map((result) => {
                            const globalIndex = results.indexOf(result);
                            const isSelected = globalIndex === selectedIndex;

                            return (
                              <Command.Item
                                key={result.id}
                                value={result.id}
                                onSelect={() => handleSelectResult(result)}
                                className={`
                                  flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                                  ${
                                    isSelected
                                      ? 'bg-primary-container/20 dark:bg-primary/20 text-primary dark:text-primary'
                                      : 'hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on dark:text-gray-100'
                                  }
                                `}
                              >
                                <div
                                  className={`flex-shrink-0 ${
                                    isSelected ? 'text-primary dark:text-primary' : 'text-surface-on-variant dark:text-gray-400'
                                  }`}
                                >
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
            </div>
          </div>
        )}
      </Command>
    </div>
  );
};

export default GlobalSearch;


