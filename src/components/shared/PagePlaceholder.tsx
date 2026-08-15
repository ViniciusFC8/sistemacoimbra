import React from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/shared/EmptyState';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  emptyStateTitle: string;
  emptyStateDescription: string;
  actionText?: string;
}

export function PagePlaceholder({
  title,
  description,
  icon,
  emptyStateTitle,
  emptyStateDescription,
  actionText
}: PagePlaceholderProps) {
  return (
    <>
      <AppHeader title={title} />
      <PageContainer className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-muted-foreground text-sm max-w-2xl">
            {description}
          </p>
          {actionText && (
            <Button className="shrink-0 w-full sm:w-auto">
              {actionText}
            </Button>
          )}
        </div>
        
        <div className="mt-4 border border-border rounded-xl bg-card/50 overflow-hidden">
          <EmptyState 
            icon={icon}
            title={emptyStateTitle}
            description={emptyStateDescription}
          />
        </div>
      </PageContainer>
    </>
  );
}
