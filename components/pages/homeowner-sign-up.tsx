import { SignUp } from '@clerk/clerk-react';

import CheckAccountEmail from '@/components/CheckAccountEmail';

export default function HomeownerSignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12">
      {/* The Wrapper Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-[480px] overflow-hidden flex flex-col">
        {/* 1. CUSTOM HEADER (Order 1) */}
        <div className="order-1 px-8 pt-8 pb-2 text-center z-10 relative">
          <h1 className="text-xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-600 mt-2">
            Creating your account? Enter the email address from your invitation.
            <br />
            {/* The Link - Forced here */}
            <span className="text-blue-600 cursor-pointer underline hover:text-blue-700">
              <CheckAccountEmail triggerText="Forgot which email to use?" />
            </span>
          </p>
        </div>

        {/* 2. CLERK FORM (Order 2) */}
        <div className="order-2 w-full">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            appearance={{
              elements: {
                // Hide internal header
                header: 'hidden',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',

                // Remove internal card shell
                card: 'shadow-none border-none bg-transparent',
                cardBox: 'shadow-none border-none bg-transparent',
                rootBox: 'w-full',

                // Remove extra padding that might push it away
                navbar: 'hidden',
                dividerRow: 'hidden',
                scrollBox: 'p-0',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

