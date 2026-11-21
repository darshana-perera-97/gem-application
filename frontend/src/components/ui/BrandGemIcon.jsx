import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Same gem mark as the mobile loading animation (Material Icons diamond_outlined).
 */
export function BrandGemIcon({ size = 24, className, title = 'GemBook', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={cn('shrink-0', className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {/* Material Icons: diamond_outlined */}
      <path d="M19 3H5L2 9l10 12L22 9l-3-6zm-1.61 5.5L12 19.04 6.61 8.5h10.78zm-2.04-2.5l1.29 2.5H6.36L7.65 6h7.7z" />
    </svg>
  );
}
