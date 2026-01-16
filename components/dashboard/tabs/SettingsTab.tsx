import React, { useState, Suspense } from 'react';
import { Settings, Users, FileText, Home, Database } from 'lucide-react';

// Lazy load views to match original architecture
const InternalUsersView = React.lazy(() => import('../views/InternalUsersView'));
const TemplatesView = React.lazy(() => import('../views/TemplatesView'));
const HomeownersDirectoryView = React.lazy(() => import('../views/HomeownersDirectoryView'));

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="p-10 text-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

export default function SettingsTab(props: any) {
  const [activeCategory, setActiveCategory] = useState('Internal Users');

  const categories = [
    { id: 'Internal Users', label: 'Internal Users', icon: Users },
    { id: 'Templates', label: 'Templates', icon: FileText },
    { id: 'Homeowners', label: 'Homeowners', icon: Home },
    { id: 'Data Import', label: 'Data Import', icon: Database },
  ];

  return (
    <div className="flex flex-col md:flex-row w-full h-full">
      <aside className="w-full md:w-64 border-r border-border bg-muted/10 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="flex-1 flex flex-col min-w-0 overflow-hidden bg-card">
        <header className="h-14 border-b border-border flex items-center px-6">
          <h2 className="font-semibold">{activeCategory}</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<LoadingSpinner label={`Loading ${activeCategory}...`} />}>
            {activeCategory === 'Internal Users' && <InternalUsersView {...props} />}
            {activeCategory === 'Templates' && <TemplatesView {...props} />}
            {activeCategory === 'Homeowners' && <HomeownersDirectoryView {...props} />}
            {activeCategory === 'Data Import' && (
              <div className="p-10 text-center text-muted-foreground">Data Import feature coming soon</div>
            )}
          </Suspense>
        </div>
      </section>
    </div>
  );
}
