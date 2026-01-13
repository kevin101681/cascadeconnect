/**
 * DashboardSkeleton.tsx
 * 
 * Edge-to-edge loading skeleton that matches the HomeownerDashboardView layout geometry.
 * Prevents layout shift by matching exact spacing/structure of the real dashboard.
 */

import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Match HomeownerDashboardView's edge-to-edge structure */}
      <div className="w-full">
        
        {/* Layer 1: Header Info (Homeowner Card) */}
        <section className="w-full bg-card px-4 py-4 md:px-6 md:py-6 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Name skeleton */}
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 mb-2"></div>
              {/* Project info skeleton */}
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            </div>
            {/* Expand button skeleton */}
            <div className="ml-3 w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0"></div>
          </div>
        </section>

        {/* Layer 2: Project Grid */}
        <section className="w-full bg-card px-4 py-4 md:px-6 md:py-6 border-y border-border/40 animate-pulse">
          {/* Section title skeleton */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-3"></div>
          
          {/* 2x2 Grid of square buttons */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="aspect-square flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
              >
                {/* Icon skeleton */}
                <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                {/* Label skeleton */}
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
              </div>
            ))}
          </div>
        </section>

        {/* Layer 3: Quick Actions */}
        <section className="w-full bg-card px-4 py-4 pb-12 md:px-6 md:py-6 animate-pulse">
          {/* Section title skeleton */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3"></div>
          
          {/* 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={`quick-${i}`} 
                className="aspect-square flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
              >
                {/* Icon skeleton */}
                <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                {/* Label skeleton */}
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-10"></div>
              </div>
            ))}
          </div>

          {/* Communication Section */}
          <div className="mt-6 pt-6 border-t border-border/40">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-3"></div>
            
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={`comm-${i}`} 
                  className="aspect-square flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                >
                  <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-14"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Section */}
          <div className="mt-6 pt-6 border-t border-border/40">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3"></div>
            
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div 
                  key={`fin-${i}`} 
                  className="aspect-square flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                >
                  <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
