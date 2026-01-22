"use client";

import React, { useState, KeyboardEvent } from 'react';
import { Search, Wrench, Loader2 } from 'lucide-react';
import { askMaintenanceAI } from '../actions/ask-maintenance-ai';

interface HomeownerSearchWidgetProps {
  className?: string;
}

const SUGGESTED_QUESTIONS = [
  "How do I change my furnace filter?",
  "Where is my water shutoff?",
  "My pilot light is out",
  "How often should I clean gutters?",
];

export function HomeownerSearchWidget({ className = '' }: HomeownerSearchWidgetProps) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setAnswer(''); // Clear previous answer
    
    try {
      const result = await askMaintenanceAI(searchQuery);
      setAnswer(result);
    } catch (error) {
      console.error('Search error:', error);
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you need help with?"
          disabled={isSearching}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-base"
        />
      </div>

      {/* Suggested Question Pills */}
      {!answer && !isSearching && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTED_QUESTIONS.map((question, idx) => (
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
