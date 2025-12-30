import React from 'react';

const HomeownerManual: React.FC = () => {
  return (
    <div className="bg-surface dark:bg-gray-800 rounded-lg overflow-hidden h-full">
      <iframe 
        src="/complete_homeowner_manual.html" 
        style={{ width: '100%', height: 'calc(100vh - 200px)', border: 'none' }}
        title="Homeowner Manual"
      />
    </div>
  );
};

export default HomeownerManual;
