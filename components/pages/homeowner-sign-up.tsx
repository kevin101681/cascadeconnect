import { SignUp } from '@clerk/clerk-react';

import CheckAccountEmail from '@/components/CheckAccountEmail';

export default function HomeownerSignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12">
      {/* 1. The Wrapper Card (White Box) */}
      <div className="w-full max-w-[480px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* 2. Custom Header Section */}
        <div className="px-10 pt-10 pb-2 text-center">
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
        <SignUp
          routing="path"
          path="/sign-up"
          appearance={{
            elements: {
              // Hide the default Clerk header completely
              header: 'hidden',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',

              // Strip the internal card styles so it blends into OUR wrapper
              rootBox: 'w-full',
              card: 'w-full shadow-none border-none bg-transparent p-0',
              cardBox: 'w-full shadow-none border-none bg-transparent p-0',

              // Align internal padding to match the custom header
              main: 'px-10 pt-4',
              form: 'px-10',
              formFieldRow: 'w-full',
              footer: 'px-10 pb-8',
            },
          }}
        />
      </div>
    </div>
  );
}

