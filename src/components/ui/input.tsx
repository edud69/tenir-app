'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isError?: boolean;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, isError = !!error, icon, disabled = false, className, type = 'text', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              'w-full px-3.5 py-2.5 text-sm border rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:bg-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-10',
              isError
                ? 'border-red-300 bg-red-50/30 focus:ring-red-400/30 focus:border-red-400'
                : 'border-gray-200 focus:ring-tenir-500/25 focus:border-tenir-400',
              className
            )}
            {...props}
          />
        </div>

        {(error || helperText) && (
          <p className={cn('mt-1.5 text-xs', isError ? 'text-red-600' : 'text-gray-400')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
