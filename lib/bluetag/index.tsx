/**
 * BlueTag Standalone Entry Point
 * 
 * This is the standalone entry point for the BlueTag app.
 * It uses LocalStorageDataProvider for data persistence.
 * 
 * To use as standalone:
 * - Create a separate HTML file that imports this
 * - Or use this as the entry point in a separate Vite/React app
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Dashboard } from './components/Dashboard';
import { LocalStorageDataProvider } from './services/dataProvider';
import { ProjectDetails, LocationGroup, SignOffTemplate } from './types';
import { generateUUID, PREDEFINED_LOCATIONS, DEFAULT_SIGN_OFF_TEMPLATES, INITIAL_PROJECT_STATE, EMPTY_LOCATIONS } from './constants';

// Generate a default project ID for standalone use
const getDefaultProjectId = (): string => {
  const stored = localStorage.getItem('bluetag_default_project_id');
  if (stored) return stored;
  const newId = generateUUID();
  localStorage.setItem('bluetag_default_project_id', newId);
  return newId;
};

const createInitialProject = (): ProjectDetails => {
  // Deep clone to avoid mutating the shared constant
  return JSON.parse(JSON.stringify(INITIAL_PROJECT_STATE));
};

const createInitialLocations = (): LocationGroup[] => {
  // Deep clone to avoid mutating the shared constant
  return JSON.parse(JSON.stringify(EMPTY_LOCATIONS));
};

const StandaloneApp: React.FC = () => {
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [locations, setLocations] = useState<LocationGroup[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [dataProvider] = useState(() => new LocalStorageDataProvider());
  const [projectId] = useState(() => getDefaultProjectId());
  const [isLoading, setIsLoading] = useState(true);

  // Load report data on mount
  useEffect(() => {
    const loadData = async () => {
      const loaded = await dataProvider.loadReport(projectId);
      if (loaded) {
        setProject(loaded.project);
        setLocations(loaded.locations);
      } else {
        setProject(createInitialProject());
        setLocations(createInitialLocations());
      }
      setIsLoading(false);
    };
    loadData();
  }, [projectId, dataProvider]);

  // Save report data whenever project or locations change
  useEffect(() => {
    if (project && locations.length >= 0 && !isLoading) {
      dataProvider.saveReport(projectId, project, locations).catch(error => {
        console.error('Error saving report:', error);
      });
    }
  }, [project, locations, projectId, dataProvider, isLoading]);

  const [signOffTemplates] = useState<SignOffTemplate[]>(() => {
    // Deep clone to avoid mutating the shared constant
    return JSON.parse(JSON.stringify(DEFAULT_SIGN_OFF_TEMPLATES));
  });

  if (isLoading || !project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-200 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-surface-on dark:text-gray-100">Loading BlueTag...</p>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      project={project}
      locations={locations}
      onSelectLocation={(id) => {}}
      onUpdateProject={setProject}
      onUpdateLocations={setLocations}
      onBack={() => {}}
      onAddIssueGlobal={(locationName, issue) => {
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
      }}
      isDarkMode={isDarkMode}
      toggleTheme={() => setIsDarkMode(!isDarkMode)}
      companyLogo="/images/logo.png"
      onModalStateChange={() => {}}
      signOffTemplates={signOffTemplates}
      onUpdateTemplates={() => {}}
      embedded={false}
      initialExpand={false}
    />
  );
};

// Export for use as standalone app
export default StandaloneApp;

// If this file is the entry point, render the app
if (typeof window !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <StandaloneApp />
      </React.StrictMode>
    );
  }
}
