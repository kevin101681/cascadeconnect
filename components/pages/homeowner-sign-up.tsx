import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SignUp } from '@clerk/clerk-react';

import CheckAccountEmail from '@/components/CheckAccountEmail';

const SLOT_ID = 'check-account-email-slot';

/**
 * Wraps Clerk <SignUp /> and injects the "Forgot which email to use?" helper
 * directly beneath the email input field.
 *
 * Clerk doesn't expose a React slot inside the form, so we create a DOM slot
 * after the email input and portal our component into it.
 */
export default function HomeownerSignUpPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ensureSlot = () => {
      // Clerk email field input name is typically "emailAddress"
      const emailInput = root.querySelector<HTMLInputElement>('input[name="emailAddress"]');
      if (!emailInput) {
        setSlotEl(null);
        return;
      }

      // If the slot already exists, reuse it.
      let slot = root.querySelector<HTMLElement>(`#${SLOT_ID}`);
      if (!slot) {
        slot = document.createElement('div');
        slot.id = SLOT_ID;
        slot.className = 'mt-2';
        emailInput.insertAdjacentElement('afterend', slot);
      }

      setSlotEl(slot);
    };

    ensureSlot();

    const observer = new MutationObserver(() => ensureSlot());
    observer.observe(root, { subtree: true, childList: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef}>
      <SignUp routing="path" path="/sign-up" />
      {slotEl ? createPortal(<CheckAccountEmail />, slotEl) : null}
    </div>
  );
}

