import React, { useState, useEffect } from 'react';
import PrivacyPolicy from './legal/PrivacyPolicy';
import TermsOfService from './legal/TermsOfService';
import AuthScreen from './AuthScreen';
import Footer from './Footer';

type LegalRoute = 'home' | 'privacy' | 'terms';

const LegalRouter: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<LegalRoute>('home');

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.slice(1); // Remove '#'
      if (hash === 'privacy') {
        setCurrentRoute('privacy');
      } else if (hash === 'terms') {
        setCurrentRoute('terms');
      } else {
        setCurrentRoute('home');
      }
    };

    // Set initial route based on hash
    handlePopState();

    // Listen for hash changes
    window.addEventListener('hashchange', handlePopState);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('hashchange', handlePopState);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigateTo = (route: LegalRoute) => {
    setCurrentRoute(route);
    if (route === 'home') {
      window.history.pushState({}, '', window.location.pathname);
    } else {
      window.history.pushState({}, '', `#${route}`);
    }
  };

  const goHome = () => navigateTo('home');

  // Render appropriate component based on route
  if (currentRoute === 'privacy') {
    return <PrivacyPolicy onBack={goHome} />;
  }

  if (currentRoute === 'terms') {
    return <TermsOfService onBack={goHome} />;
  }

  // Default: Show AuthScreen with Footer
  return (
    <>
      <AuthScreen />
      <Footer onNavigate={(route) => navigateTo(route)} />
    </>
  );
};

export default LegalRouter;

