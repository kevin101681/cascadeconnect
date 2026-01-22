"use client";

import React, { useState, KeyboardEvent, useMemo, useRef, useEffect } from 'react';
import { Wrench, Loader2, Zap, Droplet, Flame, Wind, ClipboardList, MessageSquare } from 'lucide-react';
import { askMaintenanceAI, MaintenanceAIResponse } from '../actions/ask-maintenance-ai';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const widgetRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<MaintenanceAIResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Click outside to close results and clear search text
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setResult(null);
        setQuery(""); // Clear the input text
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper function to get contextual icon for suggestion questions
  const getSuggestionIcon = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("pilot") || lowerText.includes("fire")) {
      return <Flame className="w-4 h-4 text-orange-500" />;
    }
    if (lowerText.includes("breaker") || lowerText.includes("power")) {
      return <Zap className="w-4 h-4 text-yellow-500" />;
    }
    if (lowerText.includes("leak") || lowerText.includes("water")) {
      return <Droplet className="w-4 h-4 text-blue-500" />;
    }
    if (lowerText.includes("filter") || lowerText.includes("furnace")) {
      return <Wind className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
    return <Wrench className="w-4 h-4 text-primary" />;
  };

  // Smart icon detection based on query content
  const detectQuestionType = (text: string): 'electrical' | 'plumbing' | 'hvac' | 'general' => {
    const lowerText = text.toLowerCase();
    
    // Electrical keywords
    if (lowerText.match(/electric|breaker|outlet|switch|light|wire|power|circuit/)) {
      return 'electrical';
    }
    
    // Plumbing keywords
    if (lowerText.match(/water|leak|pipe|faucet|sink|toilet|drain|plumb|shower|bath/)) {
      return 'plumbing';
    }
    
    // HVAC keywords
    if (lowerText.match(/heat|cool|hvac|furnace|ac|air condition|thermostat|temperature|vent|filter/)) {
      return 'hvac';
    }
    
    return 'general';
  };

  // Memoized icon selection based on query
  const questionType = useMemo(() => detectQuestionType(query), [query]);
  
  const getIconComponent = () => {
    switch (questionType) {
      case 'electrical':
        return Zap;
      case 'plumbing':
        return Droplet;
      case 'hvac':
        return Flame;
      default:
        return Wrench;
    }
  };
  
  const getIconColor = () => {
    switch (questionType) {
      case 'electrical':
        return 'text-yellow-500'; // Yellow for electrical
      case 'plumbing':
        return 'text-blue-500'; // Blue for plumbing
      case 'hvac':
        return 'text-orange-500'; // Orange for HVAC
      default:
        return 'text-primary'; // Primary blue for general
    }
  };
  
  const getTooltipText = () => {
    switch (questionType) {
      case 'electrical':
        return 'Electrical Issue Detected';
      case 'plumbing':
        return 'Plumbing Issue Detected';
      case 'hvac':
        return 'HVAC Issue Detected';
      default:
        return 'Maintenance Assistant';
    }
  };

  const IconComponent = getIconComponent();
  const iconColor = getIconColor();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    // Special case: "How to submit a claim" intercept
    const lowerQuery = searchQuery.toLowerCase();
    if ((lowerQuery.includes("submit") || lowerQuery.includes("file")) && (lowerQuery.includes("claim") || lowerQuery.includes("warranty"))) {
      setResult({
        answer: "Here's a detailed guide on how to submit a warranty claim.",
        action: 'HELP_TAB'
      });
      return;
    }
    
    // GUARD CLAUSE: Validate homeownerId before any search operation
    // This prevents 400 errors from invalid database queries
    if (homeownerId) {
      // If homeownerId is provided, validate it
      if (homeownerId === 'placeholder' || homeownerId.length < 10) {
        console.warn("⚠️ Search Widget: Invalid homeowner ID format");
        setResult({
          answer: "Please wait while we load your account information...",
          action: 'INFO'
        });
        return;
      }
      
      // Validate UUID format to prevent 400 errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(homeownerId)) {
        console.warn(`⚠️ Search Widget: Invalid homeowner UUID format: ${homeownerId}`);
        setResult({
          answer: "Please wait while we load your account information...",
          action: 'INFO'
        });
        return;
      }
    }
    
    setIsSearching(true);
    setResult(null); // Clear previous result
    
    try {
      console.log("🔍 Widget: Calling askMaintenanceAI with query:", searchQuery);
      const response = await askMaintenanceAI(searchQuery);
      console.log("✅ Widget: Received result from askMaintenanceAI:", response);
      setResult(response);
    } catch (error: any) {
      console.error("❌ Widget: Search error details:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        fullError: error,
      });
      setResult({
        answer: 'Sorry, something went wrong. Please try again later.',
        action: 'MESSAGE'
      });
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
      <div ref={widgetRef} className={`relative w-full ${className}`}>
        {/* Smart Icon with Animation and Tooltip */}
        <div 
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <IconComponent 
            className={`h-4 w-4 ${iconColor} transition-all duration-300 pointer-events-none ${
              isFocused ? 'animate-pulse' : ''
            } ${
              query && questionType !== 'general' ? 'scale-110' : ''
            }`}
          />
          
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute left-0 top-full mt-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg">
              {getTooltipText()}
              <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
            </div>
          )}
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Ask about troubleshooting an issue or home maintenance..."
          disabled={isSearching}
          className="w-full pl-10 pr-4 py-2 rounded-full border border-primary/30 shadow-[0_0_10px_rgba(59,130,246,0.1)] bg-white dark:bg-gray-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm relative z-0"
        />
        
        {/* Suggested Questions Dropdown - Shows when focused and empty */}
        {isFocused && !query && !isSearching && !result && (
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
                {getSuggestionIcon(question)}
                {question}
              </button>
            ))}
          </div>
        )}
        
        {/* Results Dropdown Panel */}
        {(result || isSearching) && (
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
            ) : result ? (
              // Answer display with action buttons
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconComponent className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {result.answer}
                    </p>
                    
                    {/* Action Buttons Based on Intent */}
                    {result.action !== 'INFO' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.action === 'CLAIM' && (
                          <button
                            onClick={() => {
                              navigate('/dashboard?view=claims&new=true');
                              setResult(null);
                            }}
                            className="w-auto inline-flex bg-white dark:bg-gray-800 text-primary border border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm rounded-md py-2 px-4 items-center justify-center gap-2 transition-colors text-xs font-medium"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            File Warranty Claim
                          </button>
                        )}
                        {result.action === 'MESSAGE' && (
                          <button
                            onClick={() => {
                              navigate('/dashboard?tab=messages');
                              setResult(null);
                            }}
                            className="w-auto inline-flex bg-white dark:bg-gray-800 text-primary border border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm rounded-md py-2 px-4 items-center justify-center gap-2 transition-colors text-xs font-medium"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Send Message to Builder
                          </button>
                        )}
                        {result.action === 'HELP_TAB' && (
                          <button
                            onClick={() => {
                              navigate('/dashboard?view=help');
                              setResult(null);
                            }}
                            className="w-auto inline-flex bg-white dark:bg-gray-800 text-primary border border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm rounded-md py-2 px-4 items-center justify-center gap-2 transition-colors text-xs font-medium"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            Open Warranty Guide
                          </button>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => {
                          setQuery('');
                          setResult(null);
                        }}
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Ask another question
                      </button>
                      <button
                        onClick={() => {
                          setQuery('');
                          setResult(null);
                        }}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  // Default variant: full widget with suggestions and answer display
  return (
    <div ref={widgetRef} className={`w-full bg-white dark:bg-gray-800 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          Maintenance Help
        </h2>
      </div>

      {/* Search Input */}
      <div className="relative mb-4 group">
        {/* Smart Icon with Animation and Tooltip */}
        <div 
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <IconComponent 
            className={`h-5 w-5 ${iconColor} transition-all duration-300 pointer-events-none ${
              isFocused ? 'animate-pulse' : ''
            } ${
              query && questionType !== 'general' ? 'scale-110' : ''
            }`}
          />
          
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute left-0 top-full mt-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg">
              {getTooltipText()}
              <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
            </div>
          )}
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask about troubleshooting an issue or home maintenance..."
          disabled={isSearching}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-primary/30 shadow-[0_0_10px_rgba(59,130,246,0.1)] bg-white dark:bg-gray-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base relative z-0"
        />
      </div>

      {/* Suggested Question Pills */}
      {!result && !isSearching && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SAMPLE_QUESTIONS.map((question, idx) => (
            <button
              key={idx}
              onClick={() => handlePillClick(question)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
            >
              {getSuggestionIcon(question)}
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
      {result && !isSearching && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <IconComponent className={`h-4 w-4 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </p>
              
              {/* Action Buttons Based on Intent */}
              {result.action !== 'INFO' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.action === 'CLAIM' && (
                    <button
                      onClick={() => {
                        navigate('/dashboard?view=claims&new=true');
                        setResult(null);
                      }}
                      className="w-auto inline-flex bg-white dark:bg-gray-800 text-primary border border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm rounded-md py-2 px-4 items-center justify-center gap-2 transition-colors text-sm font-medium"
                    >
                      <ClipboardList className="h-4 w-4" />
                      File Warranty Claim
                    </button>
                  )}
                  {result.action === 'MESSAGE' && (
                    <button
                      onClick={() => {
                        navigate('/dashboard?tab=messages');
                        setResult(null);
                      }}
                      className="w-auto inline-flex bg-white dark:bg-gray-800 text-primary border border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm rounded-md py-2 px-4 items-center justify-center gap-2 transition-colors text-sm font-medium"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Send Message to Builder
                    </button>
                  )}
                  {result.action === 'HELP_TAB' && (
                    <button
                      onClick={() => {
                        navigate('/dashboard?view=help');
                        setResult(null);
                      }}
                      className="w-auto inline-flex bg-white dark:bg-gray-800 text-primary border border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm rounded-md py-2 px-4 items-center justify-center gap-2 transition-colors text-sm font-medium"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Open Warranty Guide
                    </button>
                  )}
                </div>
              )}
              
              {/* New Question Button */}
              <button
                onClick={() => {
                  setQuery('');
                  setResult(null);
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
      {!result && !isSearching && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Get quick answers to common home maintenance questions
        </p>
      )}
    </div>
  );
}
