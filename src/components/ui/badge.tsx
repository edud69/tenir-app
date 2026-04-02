'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * The visual style variant of the badge
   */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  /**
   * The size of the badge
   */
  size?: 'sm' | 'md';
  /**
   * Whether to show a dot indicator
   */
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: 'bg-gray-200 text-gray-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-tenir-100 text-tenir-800',
    };

    const sizeClasses = {
      sm: 'px-2 py-1 text-xs font-medium',
      md: 'px-3 py-1.5 text-sm font-medium',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 rounded-full',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'inline-block w-2 h-2 rounded-full',
              variant === 'success' && 'bg-green-500',
              variant === 'warning' && 'bg-yellow-500',
              variant === 'error' && 'bg-red-500',
              variant === 'info' && 'bg-tenir-500',
              variant === 'default' && 'bg-gray-500'
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
export type { BadgeProps };
