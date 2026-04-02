'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /**
   * Label text displayed above the select
   */
  label?: string;
  /**
   * Error message displayed below the select
   */
  error?: string;
  /**
   * Helper text displayed below the select (when no error)
   */
  helperText?: string;
  /**
   * Whether the select is in error state
   */
  isError?: boolean;
  /**
   * Options for the select
   */
  options: SelectOption[];
  /**
   * Callback when selection changes
   */
  onChange?: (value: string | number) => void;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Optional icon to display inside the select
   */
  icon?: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      isError = !!error,
      options,
      onChange,
      disabled = false,
      placeholder = 'Sélectionner une option',
      icon,
      className,
      id,
      value,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
            {props.required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
              {icon}
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(
              'w-full px-4 py-2 border rounded-lg font-medium transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
              'appearance-none cursor-pointer',
              icon && 'pl-10',
              isError
                ? 'border-red-500 focus-visible:ring-red-500'
                : 'border-gray-300 focus-visible:ring-tenir-500',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown arrow */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
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

Select.displayName = 'Select';

export { Select };
export type { SelectProps, SelectOption };
