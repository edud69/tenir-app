'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      icon,
      iconRight,
      fullWidth = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variantClasses = {
      primary:
        'bg-tenir-600 text-white hover:bg-tenir-500 active:bg-tenir-700 focus-visible:ring-tenir-500 shadow-sm shadow-tenir-200',
      secondary:
        'bg-accent-500 text-white hover:bg-accent-400 active:bg-accent-600 focus-visible:ring-accent-500 shadow-sm shadow-accent-200',
      outline:
        'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 focus-visible:ring-tenir-400',
      ghost:
        'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:ring-tenir-400',
      danger:
        'bg-red-500 text-white hover:bg-red-400 active:bg-red-600 focus-visible:ring-red-400 shadow-sm shadow-red-100',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-11 px-5 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 opacity-70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {children && <span>{children}</span>}
          </>
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
