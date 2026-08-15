import React from 'react';
import { BrandLogo } from './BrandLogo';

interface LogoPlaceholderProps {
  className?: string;
}

export function LogoPlaceholder({ className }: LogoPlaceholderProps) {
  return (
    <BrandLogo variant="monogram" width={40} height={40} className={className} />
  );
}
