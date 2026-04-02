'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Label text displayed above the input
   */
  label?: string;
  /**
   * Error message displayed below the input
   */
  error?: string;
  /**
   * Helper text displayed below the input (when no error)
   */
  helperText?: string;
  /**
   * Whether the input is in error state
   */
  isError?: boolean;
  /**
   * Optional icon to display inside the input on the left
   */
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      isError = !!error,
      icon,
      disabled = false,
      className,
      type = 'text',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
            {props.required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-2 border rounded-lg font-medium transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
              icon && 'pl-10',
              isError
                ? 'border-red-500 focus-visible:ring-red-500'
                : 'border-gray-300 focus-visible:ring-tenir-500',
              className
            )}
            {...props}
          />
        </div>

        {(error || helperText) && (
          <p
            className={cn(
              'mt-2 text-sm',
              isError ? 'text-red-600' : 'text-gray-600'
            )}
          >
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
