import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const formSchema = z.object({
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  houseNumber: z
    .string()
    .trim()
    .regex(/^\d{1,8}$/, 'House number must be numeric'),
  zipCode: z.string().trim().regex(/^\d{5}$/, 'ZIP code must be 5 digits'),
});

type FormValues = z.infer<typeof formSchema>;

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; maskedEmail: string }
  | { status: 'error'; message: string };

type CheckAccountEmailProps = {
  /**
   * Optional custom label for the trigger (renders as a link-style button).
   * Useful for placing this inline inside other copy.
   */
  triggerText?: string;
};

export function CheckAccountEmail({ triggerText = 'Forgot which email to use?' }: CheckAccountEmailProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LookupState>({ status: 'idle' });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lastName: '',
      houseNumber: '',
      zipCode: '',
    },
    mode: 'onSubmit',
  });

  // When the dialog opens, reset UI so the user always starts clean.
  useEffect(() => {
    if (open) {
      reset({ lastName: '', houseNumber: '', zipCode: '' });
      setState({ status: 'idle' });
    }
  }, [open, reset]);

  const submitLabel = useMemo(() => {
    if (isSubmitting || state.status === 'loading') return 'Checking...';
    return 'Find My Account';
  }, [isSubmitting, state.status]);

  const onSubmit = async (values: FormValues) => {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/homeowners/lookup-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = (await res.json().catch(() => ({}))) as any;

      if (!res.ok || typeof data?.maskedEmail !== 'string') {
        setState({
          status: 'error',
          message: 'No account found. Please check your details or contact support.',
        });
        return;
      }

      setState({ status: 'success', maskedEmail: data.maskedEmail });
    } catch {
      setState({
        status: 'error',
        message: 'No account found. Please check your details or contact support.',
      });
    }
  };

  return (
    <>
      <button
        type="button"
        className="cursor-pointer text-sm text-blue-600 hover:underline underline-offset-4"
        onClick={() => setOpen(true)}
      >
        {triggerText}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClose={() => setOpen(false)} />

          <DialogHeader>
            <DialogTitle>Find My Account</DialogTitle>
            <DialogDescription>
              Enter your details and we’ll show a masked hint of the email on file.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <Label htmlFor="check-email-lastName">Last Name</Label>
              <Input
                id="check-email-lastName"
                autoComplete="family-name"
                placeholder="Martinez"
                {...register('lastName')}
              />
              {errors.lastName?.message ? (
                <p className="text-xs text-red-600">{errors.lastName.message}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="check-email-houseNumber">House Number</Label>
              <Input
                id="check-email-houseNumber"
                inputMode="numeric"
                placeholder="1234"
                {...register('houseNumber')}
              />
              {errors.houseNumber?.message ? (
                <p className="text-xs text-red-600">{errors.houseNumber.message}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="check-email-zipCode">ZIP Code</Label>
              <Input
                id="check-email-zipCode"
                inputMode="numeric"
                placeholder="90210"
                {...register('zipCode')}
              />
              {errors.zipCode?.message ? (
                <p className="text-xs text-red-600">{errors.zipCode.message}</p>
              ) : null}
            </div>

            {state.status === 'success' ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
                <p className="text-sm font-medium">We found an account!</p>
                <p className="mt-1 text-sm">
                  Please sign in with: <span className="font-semibold">{state.maskedEmail}</span>
                </p>
              </div>
            ) : null}

            {state.status === 'error' ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
                <p className="text-sm">{state.message}</p>
              </div>
            ) : null}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting || state.status === 'loading'}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || state.status === 'loading'}>
                {state.status === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CheckAccountEmail;

