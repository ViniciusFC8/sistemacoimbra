import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, children, footer }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // prevent body scroll
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end max-md:items-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer / Bottom Sheet Content */}
      <div 
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex flex-col bg-card border-l border-border w-full h-full shadow-2xl z-10 overflow-hidden inner-highlight",
          // Desktop slide-in from right
          "md:w-[500px] md:animate-slide-in-right",
          // Mobile slide-up bottom sheet
          "max-md:h-[88vh] max-md:rounded-t-2xl max-md:border-t max-md:border-l-0 max-md:border-border max-md:animate-slide-up"
        )}
      >
        {/* Handle for dragging on mobile */}
        <div className="hidden max-md:flex justify-center py-2 shrink-0">
          <div className="w-10 h-1 bg-border-strong rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 shrink-0 bg-sidebar/20">
          <h3 className="font-sora font-semibold text-base text-foreground truncate">{title}</h3>
          <button 
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 focus:outline-none">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-5 border-t border-border/60 bg-sidebar/10 shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
