import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface GuideStep {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
}

const guideSteps: GuideStep[] = [
  {
    id: 1,
    title: "Start a Service Request",
    description: "Click the 'New Claim' button to open the request form. You can submit multiple issues in a single request.",
    imageUrl: "/guide-images/step-1-new-claim.png" // Placeholder - replace with actual image
  },
  {
    id: 2,
    title: "Enter Item Details",
    description: "For each issue, upload a photo and provide a brief title/description.",
    imageUrl: "/guide-images/step-2-enter-details.png" // Placeholder - replace with actual image
  },
  {
    id: 3,
    title: "Optional: AI Writing Helper",
    description: "Not sure what to write? Click the 'AI' button to have our system analyze your photo and suggest a professional description for you.",
    imageUrl: "/guide-images/step-3-ai-helper.png" // Placeholder - replace with actual image
  },
  {
    id: 4,
    title: "Add Item to Request",
    description: "Important: Click 'Add Item to Request' to save this issue to your list. You can then add more issues if needed before submitting.",
    imageUrl: "/guide-images/step-4-add-item.png" // Placeholder - replace with actual image
  },
  {
    id: 5,
    title: "Submit All",
    description: "Once all your items are added to the 'Pending Requests' list at the bottom, click 'Submit All' to send them in one go.",
    imageUrl: "/guide-images/step-5-submit-all.png" // Placeholder - replace with actual image
  }
];

export function HomeownerWarrantyGuide() {
  const [activeStep, setActiveStep] = useState(1);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const handleStepClick = (stepId: number) => {
    setActiveStep(stepId);
    // On mobile, toggle accordion
    if (window.innerWidth < 768) {
      setExpandedStep(expandedStep === stepId ? null : stepId);
    }
  };

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
          {guideSteps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              className={`w-full text-left p-5 rounded-2xl transition-all duration-300 border-2 ${
                activeStep === step.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Step Number Circle */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                    activeStep === step.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {step.id}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-semibold mb-1 transition-colors ${
                      activeStep === step.id
                        ? 'text-blue-700 dark:text-blue-300 text-lg'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed ${
                      activeStep === step.id
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Active Indicator */}
                {activeStep === step.id && (
                  <CheckCircle2 className="flex-shrink-0 w-6 h-6 text-blue-500" />
                )}
              </div>
            </button>
          ))}
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
                {guideSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                      activeStep === step.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    <img
                      src={step.imageUrl}
                      alt={step.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback to placeholder if image doesn't exist
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    {/* Placeholder when image is missing */}
                    <div className="hidden w-full h-full flex items-center justify-center">
                      <div className="text-center p-8">
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-4xl font-bold text-blue-500">
                            {step.id}
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
                ))}
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
        {guideSteps.map((step) => (
          <div key={step.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
            {/* Step Header (Always Visible) */}
            <button
              onClick={() => handleStepClick(step.id)}
              className="w-full p-5 text-left"
            >
              <div className="flex items-start gap-4">
                {/* Step Number Circle */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    expandedStep === step.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {step.id}
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
                {expandedStep === step.id ? (
                  <ChevronUp className="flex-shrink-0 w-5 h-5 text-blue-500" />
                ) : (
                  <ChevronDown className="flex-shrink-0 w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Expanded Content (Image) */}
            {expandedStep === step.id && (
              <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 animate-slide-down">
                <div className="relative bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center">
                  <img
                    src={step.imageUrl}
                    alt={step.title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  {/* Placeholder when image is missing */}
                  <div className="hidden w-full h-full flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-3xl font-bold text-blue-500">
                          {step.id}
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
        ))}
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

