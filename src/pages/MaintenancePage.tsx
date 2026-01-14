import React from 'react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-white px-6">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center text-center">
        <img
          src="/logo.svg"
          alt="Cascade Connect"
          className="mb-8 h-14 w-auto"
        />

        <h1 className="text-2xl font-semibold text-gray-800 sm:text-3xl">
          We are currently improving the portal.
        </h1>
        <p className="mt-3 text-base text-gray-600 sm:text-lg">
          Scheduled maintenance is in progress. Check back soon.
        </p>
      </div>
    </div>
  );
}

