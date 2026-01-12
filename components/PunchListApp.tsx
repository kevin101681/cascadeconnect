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

// Import BlueTag types from copied files
import type { ProjectDetails, LocationGroup, SignOffTemplate } from '../lib/bluetag/types';

interface PunchListAppProps {
  homeowner?: Homeowner;
  onClose: () => void;
  onSavePDF?: (pdfBlob: Blob, filename: string) => void;
  onCreateMessage?: (homeownerId: string, subject: string, content: string, attachments?: Array<{ filename: string; content: string; contentType: string }>) => Promise<void>;
  onShowManual?: () => void;
  onUpdateHomeowner?: (homeowner: Homeowner) => void;
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
  onShowManual,
  onUpdateHomeowner
}) => {
  if (!homeowner) return null;

  const [BlueTagDashboard, setBlueTagDashboard] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing report if it exists, otherwise create new one
  const loadReportData = (): { project: ProjectDetails; locations: LocationGroup[] } => {
    const reportKey = `bluetag_report_${homeowner.id}`;
    const savedReport = localStorage.getItem(reportKey);
    
    if (savedReport) {
      try {
        const reportData = JSON.parse(savedReport);
        console.log('✅ Loaded existing punch list report for homeowner:', homeowner.id);
        return {
          project: reportData.project || createInitialProject(),
          locations: reportData.locations || createInitialLocations()
        };
      } catch (e) {
        console.error('Error loading saved report, creating new one:', e);
      }
    }
    
    // Create new report if none exists
    console.log('Creating new punch list report for homeowner:', homeowner.id);
    return {
      project: createInitialProject(),
      locations: createInitialLocations()
    };
  };

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

  const initialData = loadReportData();
  const [project, setProject] = useState<ProjectDetails>(initialData.project);
  const [locations, setLocations] = useState<LocationGroup[]>(initialData.locations);
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

  // Dynamically import BlueTag Dashboard
  useEffect(() => {
    const loadBlueTag = async () => {
      try {
        console.log('Attempting to import Dashboard...');
        const module = await import('../lib/bluetag/components/Dashboard');
        console.log('Dashboard module loaded:', module);
        
        if (module && module.Dashboard) {
          console.log('Dashboard component found, setting it...');
          setBlueTagDashboard(() => module.Dashboard);
          setIsLoading(false);
        } else {
          console.error('Dashboard component not found in module. Available exports:', Object.keys(module || {}));
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Failed to load BlueTag Dashboard:', error);
        console.error('Error details:', error);
        if (error instanceof Error) {
          console.error('Error stack:', error.stack);
        }
        // If it's a 404 error, suggest clearing cache
        if (error?.message?.includes('404') || error?.message?.includes('Failed to fetch')) {
          console.warn('Asset file not found. This may be a caching issue. Please try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)');
        }
        setIsLoading(false);
      }
    };
    loadBlueTag();
  }, []);

  // Sync project fields when homeowner changes (update values but preserve IDs and structure)
  useEffect(() => {
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
  }, [homeowner.name, homeowner.jobName, homeowner.address, homeowner.phone, homeowner.email, homeowner.id]);

  // Handler to sync project field changes back to homeowner data
  const handleProjectUpdate = (updatedProject: ProjectDetails) => {
    setProject(updatedProject);
    
    // If onUpdateHomeowner is provided, sync field changes back to Cascade Connect
    if (onUpdateHomeowner && updatedProject.fields) {
      const fields = updatedProject.fields;
      
      // Find fields by label (more reliable than index)
      const nameField = fields.find(f => f.label === 'Name(s)' || f.label.toLowerCase().includes('name'));
      const jobNameField = fields.find(f => f.label === 'Project Lot/Unit Number' || f.label.toLowerCase().includes('lot') || f.label.toLowerCase().includes('unit'));
      const addressField = fields.find(f => f.label === 'Address' || f.label.toLowerCase().includes('address'));
      const phoneField = fields.find(f => f.label === 'Phone Number' || f.label.toLowerCase().includes('phone'));
      const emailField = fields.find(f => f.label === 'Email Address' || f.label.toLowerCase().includes('email'));
      
      // Parse address into components if needed
      let street = homeowner.street || '';
      let city = homeowner.city || '';
      let state = homeowner.state || '';
      let zip = homeowner.zip || '';
      
      if (addressField?.value) {
        // Try to parse address if it's in format "Street, City, State ZIP"
        const addressParts = addressField.value.split(',').map(s => s.trim());
        if (addressParts.length >= 3) {
          street = addressParts[0] || '';
          city = addressParts[1] || '';
          const stateZip = addressParts[2] || '';
          const stateZipMatch = stateZip.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/);
          if (stateZipMatch) {
            state = stateZipMatch[1];
            zip = stateZipMatch[2];
          } else {
            // Fallback: try to split by space
            const parts = stateZip.split(/\s+/);
            if (parts.length >= 2) {
              state = parts[0];
              zip = parts.slice(1).join(' ');
            }
          }
        } else if (addressParts.length === 1) {
          // Single line address, keep as is
          street = addressParts[0];
        }
      }
      
      // Build updated homeowner object
      const updatedHomeowner: Homeowner = {
        ...homeowner,
        name: nameField?.value || homeowner.name,
        jobName: jobNameField?.value || homeowner.jobName,
        address: addressField?.value || homeowner.address,
        street: street,
        city: city,
        state: state,
        zip: zip,
        phone: phoneField?.value || homeowner.phone,
        email: emailField?.value || homeowner.email,
      };
      
      // Update homeowner in Cascade Connect
      onUpdateHomeowner(updatedHomeowner);
    }
  };

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
    if (!homeowner?.id) return;
    const reportKey = `bluetag_report_${homeowner.id}`;
    const reportData = {
      project,
      locations,
      lastModified: Date.now()
    };
    localStorage.setItem(reportKey, JSON.stringify(reportData));
  }, [project, locations, homeowner?.id]);

  // Debug: Log when Dashboard is about to render (must be before any early returns)
  useEffect(() => {
    if (BlueTagDashboard) {
      console.log('Rendering BlueTag Dashboard with props:', {
        projectFields: project.fields?.length,
        locationsCount: locations.length,
        isDarkMode,
        embedded: true,
        initialExpand: false
      });
    }
  }, [BlueTagDashboard, project, locations, isDarkMode]);

  if (isLoading || !BlueTagDashboard) {
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
    <div className="h-full w-full flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {BlueTagDashboard ? (
        <div className="h-full w-full overflow-auto" style={{ isolation: 'isolate' }}>
          <BlueTagDashboard
          project={project}
          locations={locations}
          onSelectLocation={handleSelectLocation}
          onUpdateProject={handleProjectUpdate}
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
          onSavePDF={onSavePDF}
        />
        </div>
      ) : (
        <div className="p-4 text-red-500">Dashboard component not loaded</div>
      )}
    </div>
  );
};

export default PunchListApp;
