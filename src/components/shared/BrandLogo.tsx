import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  /**
   * 'monogram' displays only the stylized "C" mark.
   * 'full' displays the complete vertical logo (mark + COMERCIAL COIMBRA text).
   */
  variant?: 'monogram' | 'full';
  className?: string;
  width?: string | number;
  height?: string | number;
  priority?: boolean;
}

export function BrandLogo({
  variant = 'monogram',
  className,
  width = '100%',
  height = '100%',
  priority = false,
}: BrandLogoProps) {
  const containerStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (variant === 'monogram') {
    return (
      <div 
        className={cn(
          "relative overflow-hidden shrink-0 flex items-center justify-center", 
          className
        )}
        style={containerStyle}
      >
        <Image
          src="/images/comercial-coimbra-logo.svg"
          alt="Monograma Comercial Coimbra"
          fill
          priority={priority}
          className="object-cover object-[50%_2%] scale-[2.1]"
        />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden shrink-0 flex items-center justify-center", 
        className
      )}
      style={containerStyle}
    >
      <Image
        src="/images/comercial-coimbra-logo.svg"
        alt="Logo Comercial Coimbra"
        fill
        priority={priority}
        className="object-contain"
      />
    </div>
  );
}
