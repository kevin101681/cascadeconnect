import React, { Suspense, useEffect, useState } from 'react';

// Non-critical UI providers/hosts should not block initial paint.
const LazyModalProvider = React.lazy(() =>
  import('./modal-provider').then((m) => ({ default: m.ModalProvider }))
);

export const LazyAppProviders: React.FC = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const enable = () => {
      // Delay by ~1.5s so the UI paints first.
      window.setTimeout(() => setEnabled(true), 1500);
    };

    if (document.readyState === 'complete') {
      enable();
      return;
    }

    window.addEventListener('load', enable, { once: true });
    return () => window.removeEventListener('load', enable);
  }, []);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <LazyModalProvider />
    </Suspense>
  );
};

