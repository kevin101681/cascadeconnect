import { SignUp } from '@clerk/clerk-react';

import CheckAccountEmail from '@/components/CheckAccountEmail';

export default function HomeownerSignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12">
      {/* 1. The Wrapper Card (White Box) */}
      <div className="w-full max-w-[480px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        {/* 2. Custom Header Section */}
        <div className="px-8 pt-8 pb-2 text-center">
          <h1 className="mb-2 text-xl font-bold text-gray-900">Create your account</h1>

          <p className="text-sm leading-relaxed text-gray-600">
            Creating your account? Enter the email address from your invitation to link your account.
            {/* 3. The Inline Link */}
            <span className="ml-1 inline-block">
              <CheckAccountEmail triggerText="Forgot which email to use?" />
            </span>
          </p>
        </div>

        {/* 4. The "Seamless" Clerk Form */}
        <div id="clerk-merge-wrapper">
          <style>{`
            /* Fallback: force Clerk "card" to become transparent/flat */
            #clerk-merge-wrapper .cl-card,
            #clerk-merge-wrapper [class*="cl-card"] {
              box-shadow: none !important;
              border: none !important;
              background: transparent !important;
              border-radius: 0 !important;
            }
            #clerk-merge-wrapper .cl-scrollBox,
            #clerk-merge-wrapper [class*="cl-scrollBox"] {
              padding: 0 !important;
            }
          `}</style>

          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            appearance={{
              layout: {
                socialButtonsPlacement: 'bottom',
                showOptionalFields: false,
              },
              elements: {
                // 1. Hide the Default Header completely
                header: 'hidden',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',

                // Also hide any internal top nav/step header so nothing "floats" above our card
                navbar: 'hidden',

                // 2. KILL THE CLERK CARD STYLES (Make it transparent)
                card: 'shadow-none border-none bg-transparent rounded-none',
                cardBox: 'shadow-none border-none bg-transparent rounded-none',

                // 3. Reset internal sizing so it fills our wrapper
                rootBox: 'w-full',

                // 4. Adjust padding to flow naturally from our custom header
                scrollBox: 'p-0',
                formFieldRow: 'w-full',

                // 5. Ensure the footer (if any) looks integrated
                footer: 'bg-transparent pb-6 px-8',
                footerAction: 'hidden',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

