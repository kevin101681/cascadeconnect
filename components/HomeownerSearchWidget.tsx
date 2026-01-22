"use client";

import React, { useState, KeyboardEvent } from 'react';
import { Search, Wrench, Loader2 } from 'lucide-react';
import { askMaintenanceAI } from '../actions/ask-maintenance-ai';

interface HomeownerSearchWidgetProps {
  className?: string;
  variant?: 'default' | 'header';
  homeownerId?: string; // Optional: used for future enhancements
}

const SAMPLE_QUESTIONS = [
  "How do I replace my furnace filter?",
  "How do I light the fireplace pilot?",
  "Why is my garbage disposal humming?",
  "How do I reset a tripped breaker?",
  "Water is leaking under my sink"
];

export function HomeownerSearchWidget({ className = '', variant = 'default', homeownerId }: HomeownerSearchWidgetProps) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    // GUARD CLAUSE: Validate homeownerId before any search operation
    // This prevents 400 errors from invalid database queries
    if (homeownerId) {
      // If homeownerId is provided, validate it
      if (homeownerId === 'placeholder' || homeownerId.length < 10) {
        console.warn("⚠️ Search Widget: Invalid homeowner ID format");
        setAnswer("Please wait while we load your account information...");
        return;
      }
      
      // Validate UUID format to prevent 400 errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(homeownerId)) {
        console.warn(`⚠️ Search Widget: Invalid homeowner UUID format: ${homeownerId}`);
        setAnswer("Please wait while we load your account information...");
        return;
      }
    }
    
    setIsSearching(true);
    setAnswer(''); // Clear previous answer
    
    try {
      console.log("🔍 Widget: Calling askMaintenanceAI with query:", searchQuery);
      const result = await askMaintenanceAI(searchQuery);
      console.log("✅ Widget: Received result from askMaintenanceAI");
      setAnswer(result);
    } catch (error: any) {
      console.error("❌ Widget: Search error details:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        fullError: error,
      });
      setAnswer('Sorry, something went wrong. Please try again later.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const handlePillClick = (question: string) => {
    setQuery(question);
    handleSearch(question);
  };

  // Header variant: compact, inline search bar with dropdown results
  if (variant === 'header') {
    return (
      <div className={`relative w-full ${className}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Wrench className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none z-10" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Ask about home maintenance..."
          disabled={isSearching}
          className="w-full pl-10 pr-10 py-2 rounded-full border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm relative z-20"
        />
        
        {/* Loading indicator for header variant */}
        {isSearching && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-30">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
        
        {/* Suggested Questions Dropdown - Shows when focused and empty */}
        {isFocused && !query && !isSearching && !answer && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
              Suggested Questions
            </div>
            {SAMPLE_QUESTIONS.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(question);
                  handleSearch(question);
                  setIsFocused(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
              >
                <span className="text-gray-400 dark:text-gray-500">💡</span>
                {question}
              </button>
            ))}
          </div>
        )}
        
        {/* Results Dropdown Panel */}
        {(answer || isSearching) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-50 max-w-2xl">
            {isSearching ? (
              // Loading state
              <div className="flex items-center gap-3 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                </div>
              </div>
            ) : (
              // Answer display
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {answer}
                    </p>
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => {
                          setQuery('');
                          setAnswer('');
                        }}
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Ask another question
                      </button>
                      <button
                        onClick={() => setAnswer('')}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant: full widget with suggestions and answer display
  return (
    <div className={`w-full bg-white dark:bg-gray-800 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          Maintenance Help
        </h2>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about troubleshooting an issue or home maintenance..."
          disabled={isSearching}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-base"
        />
      </div>

      {/* Suggested Question Pills */}
      {!answer && !isSearching && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SAMPLE_QUESTIONS.map((question, idx) => (
            <button
              key={idx}
              onClick={() => handlePillClick(question)}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Answer Display */}
      {answer && !isSearching && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {answer}
              </p>
              
              {/* New Question Button */}
              <button
                onClick={() => {
                  setQuery('');
                  setAnswer('');
                }}
                className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Ask another question →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Helper Text */}
      {!answer && !isSearching && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Get quick answers to common home maintenance questions
        </p>
      )}
    </div>
  );
}
