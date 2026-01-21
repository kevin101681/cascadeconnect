'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { getGuideSteps } from '@/actions/guide-editor';
import type { GuideStep } from '@/db/schema';

export function HomeownerWarrantyGuide() {
  const [guideSteps, setGuideSteps] = useState<GuideStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  useEffect(() => {
    loadSteps();
  }, []);

  const loadSteps = async () => {
    try {
      setLoading(true);
      const steps = await getGuideSteps();
      setGuideSteps(steps);
      
      // Set active step to first step if available
      if (steps.length > 0) {
        setActiveStep(1);
      }
    } catch (error) {
      console.error('Failed to load guide steps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setActiveStep(stepIndex);
    // On mobile, toggle accordion
    if (window.innerWidth < 768) {
      setExpandedStep(expandedStep === stepIndex ? null : stepIndex);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            How to Submit a Warranty Request
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Loading guide...
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  // Empty state
  if (guideSteps.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            How to Submit a Warranty Request
          </h1>
        </div>
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p>Guide steps are being configured. Please check back soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          How to Submit a Warranty Request
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Follow these simple steps to submit your service requests quickly and efficiently.
        </p>
      </div>

      {/* Desktop: Two Column Layout */}
      <div className="hidden md:grid md:grid-cols-12 gap-8">
        {/* Left Column: Steps List */}
        <div className="md:col-span-5 space-y-3">
          {guideSteps.map((step, index) => {
            const stepNum = index + 1;
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(stepNum)}
                className={`w-full text-left p-5 rounded-2xl transition-all duration-300 border-2 ${
                  activeStep === stepNum
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Step Number Circle */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      activeStep === stepNum
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {stepNum}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold mb-1 transition-colors ${
                        activeStep === stepNum
                          ? 'text-blue-700 dark:text-blue-300 text-lg'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed ${
                        activeStep === stepNum
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>

                  {/* Active Indicator */}
                  {activeStep === stepNum && (
                    <CheckCircle2 className="flex-shrink-0 w-6 h-6 text-blue-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Phone/Browser Mockup */}
        <div className="md:col-span-7">
          <div className="sticky top-8">
            <Card className="overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-xl">
              {/* Card Header */}
              <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 ml-4 text-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Step {activeStep}: {guideSteps[activeStep - 1]?.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Image Container with Transition */}
              <div className="relative bg-gray-100 dark:bg-gray-900 aspect-[4/3] flex items-center justify-center">
                {guideSteps.map((step, index) => {
                  const stepNum = index + 1;
                  return (
                    <div
                      key={step.id}
                      className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                        activeStep === stepNum ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <img
                        src={step.imageUrl}
                        alt={step.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback to placeholder if image doesn't exist
                          e.currentTarget.style.display = 'none';
                          const sibling = e.currentTarget.nextElementSibling;
                          if (sibling) sibling.classList.remove('hidden');
                        }}
                      />
                      {/* Placeholder when image is missing */}
                      <div className="hidden w-full h-full flex items-center justify-center">
                        <div className="text-center p-8">
                          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="text-4xl font-bold text-blue-500">
                              {stepNum}
                            </span>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                            {step.title}
                          </p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                            Visual preview coming soon
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Navigation Hint */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Click on any step to view its details
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Accordion Style */}
      <div className="md:hidden space-y-3">
        {guideSteps.map((step, index) => {
          const stepNum = index + 1;
          return (
            <div key={step.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
              {/* Step Header (Always Visible) */}
              <button
                onClick={() => handleStepClick(stepNum)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start gap-4">
                  {/* Step Number Circle */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      expandedStep === stepNum
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {stepNum}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Expand/Collapse Icon */}
                  {expandedStep === stepNum ? (
                    <ChevronUp className="flex-shrink-0 w-5 h-5 text-blue-500" />
                  ) : (
                    <ChevronDown className="flex-shrink-0 w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content (Image) */}
              {expandedStep === stepNum && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 animate-slide-down">
                  <div className="relative bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center">
                    <img
                      src={step.imageUrl}
                      alt={step.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const sibling = e.currentTarget.nextElementSibling;
                        if (sibling) sibling.classList.remove('hidden');
                      }}
                    />
                    {/* Placeholder when image is missing */}
                    <div className="hidden w-full h-full flex items-center justify-center">
                      <div className="text-center p-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-3xl font-bold text-blue-500">
                            {stepNum}
                          </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                          {step.title}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                          Visual preview coming soon
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Ready to Get Started?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Submit your first warranty request now and we'll get it handled quickly.
          </p>
          <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full transition-colors shadow-md hover:shadow-lg">
            Create New Request
          </button>
        </div>
      </div>
    </div>
  );
}

