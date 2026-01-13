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
    const isVisible = (el: HTMLElement) => {
      // offsetParent is null for display:none and for elements in hidden trees (good enough here)
      return !!(el.offsetParent || el.getClientRects().length);
    };

    const findEmailInput = () => {
      // Prefer Clerk's emailAddress field when present.
      const named = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="emailAddress"]'));
      const visibleNamed = named.find((i) => isVisible(i));
      if (visibleNamed) return visibleNamed;

      // Fallback: any visible email-type input (Clerk uses this on the first step).
      const emails = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="email"]'));
      return emails.find((i) => isVisible(i)) || null;
    };

    const findAnchor = (emailInput: HTMLInputElement) => {
      // Try to insert after the field row/container so spacing is correct.
      const candidates = [
        '[data-testid*="formField"]',
        '[data-testid*="emailAddress"]',
        '[class*="cl-formFieldRow"]',
        '[class*="cl-formField"]',
      ];
      for (const sel of candidates) {
        const el = emailInput.closest<HTMLElement>(sel);
        if (el) return el;
      }
      // Fallback to input's parent.
      return emailInput.parentElement as HTMLElement | null;
    };

    const ensureSlot = () => {
      const emailInput = findEmailInput();
      if (!emailInput) {
        setSlotEl(null);
        return;
      }

      const anchor = findAnchor(emailInput);
      if (!anchor || !anchor.parentElement) {
        setSlotEl(null);
        return;
      }

      // Reuse an existing slot if it exists anywhere (Clerk may re-render trees).
      let slot = document.getElementById(SLOT_ID);
      if (!slot) {
        slot = document.createElement('div');
        slot.id = SLOT_ID;
        slot.className = 'mt-2';
      }

      // Ensure the slot lives directly after the email field container.
      if (slot.previousSibling !== anchor) {
        anchor.insertAdjacentElement('afterend', slot);
      }

      setSlotEl(slot);
    };

    ensureSlot();

    // Observe the entire document because Clerk can render via portals and step transitions.
    const observer = new MutationObserver(() => ensureSlot());
    observer.observe(document.body, { subtree: true, childList: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef}>
      <SignUp routing="path" path="/sign-up" />
      {slotEl ? createPortal(<CheckAccountEmail />, slotEl) : null}
    </div>
  );
}

