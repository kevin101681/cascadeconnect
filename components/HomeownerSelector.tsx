import React from 'react';
import { Homeowner } from '../types';
import Button from './Button';
import { Home, MapPin, Building2, Calendar, X, Check } from 'lucide-react';

interface HomeownerSelectorProps {
  homeowners: Homeowner[];
  onSelect: (homeowner: Homeowner) => void;
}

const HomeownerSelector: React.FC<HomeownerSelectorProps> = ({ homeowners, onSelect }) => {
  return (
    <div className="min-h-screen bg-surface dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-2 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
          <h1 className="text-2xl font-normal text-surface-on dark:text-gray-100">Select Property</h1>
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
            You have multiple properties associated with this email. Please select which property you'd like to view.
          </p>
        </div>

        {/* Homeowner List */}
        <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
          {homeowners.map((homeowner) => (
            <button
              key={homeowner.id}
              onClick={() => onSelect(homeowner)}
              className="w-full text-left bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600 hover:border-primary hover:shadow-elevation-1 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-surface-on dark:text-gray-100 group-hover:text-primary transition-colors">
                      {homeowner.name}
                    </h3>
                    {homeowner.jobName && (
                      <span className="bg-primary-container dark:bg-primary/20 text-primary-on-container dark:text-primary text-xs font-medium px-2 py-1 rounded-full">
                        {homeowner.jobName}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 text-sm text-surface-on-variant dark:text-gray-400">
                    {homeowner.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{homeowner.address}</span>
                      </div>
                    )}
                    {homeowner.builder && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{homeowner.builder}</span>
                      </div>
                    )}
                    {homeowner.closingDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Closing: {new Date(homeowner.closingDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-on transition-colors">
                    <Check className="h-5 w-5 text-primary group-hover:text-primary-on" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeownerSelector;

