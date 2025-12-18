/**
 * Punch List App Component
 * 
 * This component integrates the BlueTag (PDF Reports) App into Cascade Connect.
 * It:
 * 1. Maps homeowner contact info to BlueTag's ProjectField format
 * 2. Embeds the full BlueTag Dashboard component
 * 3. Handles PDF generation and saves to homeowner documents
 */

import React, { useState, useEffect } from 'react';
import { Homeowner } from '../types';
import { X, ClipboardList } from 'lucide-react';

// Import BlueTag types and components directly (no dynamic import)
import type { ProjectDetails, LocationGroup, SignOffTemplate } from '../lib/bluetag/types';
import { DatabaseDataProvider, IDataProvider, LocalStorageDataProvider } from '../lib/bluetag/services/dataProvider';
import { Dashboard as BlueTagDashboard } from '../lib/bluetag/components/Dashboard';

interface PunchListAppProps {
  homeowner: Homeowner;
  onClose: () => void;
  onSavePDF?: (pdfBlob: Blob, filename: string) => void;
  onCreateMessage?: (homeownerId: string, subject: string, content: string, attachments?: Array<{ filename: string; content: string; contentType: string }>) => Promise<void>;
  onShowManual?: () => void;
}

// Helper to generate UUID
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const PREDEFINED_LOCATIONS = [
  "General Interior", "Master Bathroom", "Master Bedroom", "Kitchen", "Living Room",
  "Dining Room", "Garage", "Exterior", "Basement", "Attic", "Rewalk Notes"
];

const PunchListApp: React.FC<PunchListAppProps> = ({
  homeowner,
  onClose,
  onSavePDF,
  onCreateMessage,
  onShowManual
}) => {
  // BlueTag Dashboard is now directly imported (no dynamic loading needed)

  const createInitialProject = (): ProjectDetails => ({
    fields: [
      { id: generateUUID(), label: 'Name(s)', value: homeowner.name, icon: 'User' },
      { id: generateUUID(), label: 'Project Lot/Unit Number', value: homeowner.jobName || '', icon: 'Hash' },
      { id: generateUUID(), label: 'Address', value: homeowner.address, icon: 'MapPin' },
      { id: generateUUID(), label: 'Phone Number', value: homeowner.phone || '', icon: 'Phone' },
      { id: generateUUID(), label: 'Email Address', value: homeowner.email, icon: 'Mail' },
      { id: 'homeownerId', label: 'Homeowner ID', value: homeowner.id, icon: 'User' } // Hidden field for homeowner ID
    ]
  });

  const createInitialLocations = (): LocationGroup[] =>
    PREDEFINED_LOCATIONS.map(name => ({
      id: generateUUID(),
      name,
      issues: []
    }));

  // Data provider - will be set to use database when integrated
  const [dataProvider, setDataProvider] = useState<IDataProvider | null>(null);
  const [reportData, setReportData] = useState<{ project: ProjectDetails; locations: LocationGroup[] } | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(true);

  // Initialize data provider and load report
  useEffect(() => {
    const initializeDataProvider = async () => {
      try {
        // Try to use database provider if available, fallback to localStorage
        const { db, isDbConfigured } = await import('../db');
        const { bluetagReports } = await import('../db/schema');
        const { DatabaseDataProvider, LocalStorageDataProvider } = await import('../lib/bluetag/services/dataProvider');
        
        let provider: IDataProvider;
        
        if (isDbConfigured && db) {
          console.log('Using database provider for BlueTag reports');
          provider = new DatabaseDataProvider(db, bluetagReports);
        } else {
          console.log('Database not configured, using localStorage provider for BlueTag reports');
          provider = new LocalStorageDataProvider();
        }
        
        setDataProvider(provider);

        // Load existing report
        const loaded = await provider.loadReport(homeowner.id);
        if (loaded) {
          console.log('✅ Loaded existing punch list report for homeowner:', homeowner.id);
          setReportData(loaded);
        } else {
          console.log('Creating new punch list report for homeowner:', homeowner.id);
          setReportData({
            project: createInitialProject(),
            locations: createInitialLocations()
          });
        }
        setIsLoadingReport(false);
      } catch (error) {
        console.error('Error initializing data provider, falling back to localStorage:', error);
        // Fallback to localStorage
        const { LocalStorageDataProvider } = await import('../lib/bluetag/services/dataProvider');
        const provider = new LocalStorageDataProvider();
        setDataProvider(provider);
        
        const loaded = await provider.loadReport(homeowner.id);
        if (loaded) {
          setReportData(loaded);
        } else {
          setReportData({
            project: createInitialProject(),
            locations: createInitialLocations()
          });
        }
        setIsLoadingReport(false);
      }
    };

    initializeDataProvider();
  }, [homeowner.id]);

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [locations, setLocations] = useState<LocationGroup[]>([]);
  
  // Initialize project and locations from loaded data
  useEffect(() => {
    if (reportData) {
      setProject(reportData.project);
      setLocations(reportData.locations);
    }
  }, [reportData]);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [signOffTemplates, setSignOffTemplates] = useState<SignOffTemplate[]>([
    {
      id: 'standard',
      name: 'New Home Orientation Sign Off',
      sections: [
        {
          id: 'warranty_proc',
          title: "Warranty Procedures",
          body: "Homeowners are responsible for initiating their requests for warranty repairs...",
          type: 'text'
        },
        {
          id: 'ack',
          title: "Acknowledgements",
          body: "Buyer(s) agree, other than noted on the Builder's New Home Completion List...",
          type: 'signature'
        },
        {
          id: 'sign_off',
          title: "Sign Off",
          body: "",
          type: 'signature'
        }
      ]
    }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Register PDF save callback with PDF service
  useEffect(() => {
    const registerCallback = async () => {
      try {
        const pdfService = await import('../lib/bluetag/pdfService');
        pdfService.registerPDFSaveCallback(async (pdfBlob: Blob, filename: string) => {
          if (onSavePDF) {
            await onSavePDF(pdfBlob, filename);
          }
        });
      } catch (error) {
        console.error('Failed to register PDF callback:', error);
      }
    };
    
    registerCallback();
    
    return () => {
      // Cleanup: unregister callback
      import('../lib/bluetag/pdfService').then(module => {
        module.unregisterPDFSaveCallback();
      }).catch(() => {});
    };
  }, [onSavePDF]);

  // BlueTag Dashboard is now directly imported (no dynamic loading needed)

  // Sync project fields when homeowner changes (update values but preserve IDs and structure)
  useEffect(() => {
    if (project) {
      setProject(prev => ({
        ...prev,
        fields: [
          { id: prev.fields[0]?.id || generateUUID(), label: 'Name(s)', value: homeowner.name, icon: 'User' },
          { id: prev.fields[1]?.id || generateUUID(), label: 'Project Lot/Unit Number', value: homeowner.jobName || '', icon: 'Hash' },
          { id: prev.fields[2]?.id || generateUUID(), label: 'Address', value: homeowner.address, icon: 'MapPin' },
          { id: prev.fields[3]?.id || generateUUID(), label: 'Phone Number', value: homeowner.phone || '', icon: 'Phone' },
          { id: prev.fields[4]?.id || generateUUID(), label: 'Email Address', value: homeowner.email, icon: 'Mail' },
          { id: 'homeownerId', label: 'Homeowner ID', value: homeowner.id, icon: 'User' } // Hidden field for homeowner ID
        ]
      }));
    }
  }, [homeowner.name, homeowner.jobName, homeowner.address, homeowner.phone, homeowner.email, homeowner.id, project]);

  const handleSelectLocation = (id: string) => {
    setActiveLocationId(id);
  };

  const handleBackFromLocation = () => {
    setActiveLocationId(null);
  };

  const handleAddIssueGlobal = (locationName: string, issue: any) => {
    const locIndex = locations.findIndex(l => l.name === locationName);
    let newLocations = [...locations];
    
    if (locIndex >= 0) {
      const loc = newLocations[locIndex];
      newLocations[locIndex] = { ...loc, issues: [...loc.issues, issue] };
    } else {
      newLocations.push({
        id: generateUUID(),
        name: locationName,
        issues: [issue]
      });
    }
    setLocations(newLocations);
  };

  // Save report data whenever project or locations change
  useEffect(() => {
    if (dataProvider && project && locations.length >= 0) {
      dataProvider.saveReport(homeowner.id, project, locations).catch(error => {
        console.error('Error saving report:', error);
      });
    }
  }, [project, locations, homeowner.id, dataProvider]);

  // Debug: Log when Dashboard is about to render (must be before any early returns)
  useEffect(() => {
    if (project) {
      console.log('Rendering BlueTag Dashboard with props:', {
        projectFields: project.fields?.length,
        locationsCount: locations.length,
        isDarkMode,
        embedded: true,
        initialExpand: false
      });
    }
  }, [project, locations, isDarkMode]);

  if (isLoadingReport || !project) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-surface-on dark:text-gray-100">Loading Punch List App...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-auto bg-gray-200 dark:bg-gray-950" style={{ minHeight: '100%', pointerEvents: 'auto' }}>
      <div className="h-full w-full" style={{ isolation: 'isolate', pointerEvents: 'auto' }}>
        <BlueTagDashboard
          project={project}
          locations={locations}
          onSelectLocation={handleSelectLocation}
          onUpdateProject={setProject}
          onUpdateLocations={setLocations}
          onBack={handleBackFromLocation}
          onAddIssueGlobal={handleAddIssueGlobal}
          isDarkMode={isDarkMode}
          toggleTheme={() => setIsDarkMode(!isDarkMode)}
          companyLogo="/images/logo.png"
          onModalStateChange={setIsModalOpen}
          signOffTemplates={signOffTemplates}
          onUpdateTemplates={setSignOffTemplates}
          embedded={true}
          initialExpand={false}
          onCreateMessage={onCreateMessage}
          onShowManual={onShowManual}
        />
      </div>
    </div>
  );
};

export default PunchListApp;
