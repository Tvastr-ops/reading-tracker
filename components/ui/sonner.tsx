'use client';

import { Toaster as SonnerToaster } from 'sonner';

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <SonnerToaster
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card-bg group-[.toaster]:text-text group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans',
          description: 'group-[.toast]:text-text-muted',
          actionButton:
            'group-[.toast]:bg-accent-color group-[.toast]:text-accent-text font-medium',
          cancelButton: 'group-[.toast]:bg-surface group-[.toast]:text-text-muted',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
