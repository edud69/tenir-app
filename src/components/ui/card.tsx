'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', shadow = 'sm', interactive = false, className, children, ...props }, ref) => {
    const paddingClasses = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const shadowClasses = {
      none: '',
      sm: 'shadow-sm shadow-gray-100',
      md: 'shadow shadow-gray-100',
      lg: 'shadow-lg shadow-gray-200',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white border border-gray-100 rounded-2xl',
          paddingClasses[padding],
          shadowClasses[shadow],
          interactive && 'transition-all duration-200 hover:shadow-md hover:shadow-gray-200 hover:border-tenir-200 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('mb-5 pb-4 border-b border-gray-50', className)} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}
const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, level = 'h2', children, ...props }, ref) => {
    const Heading = level;
    return (
      <Heading ref={ref as any} className={cn('text-base font-semibold text-gray-900', className)} {...props}>
        {children}
      </Heading>
    );
  }
);
CardTitle.displayName = 'CardTitle';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props}>{children}</div>
  )
);
CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('mt-4 pt-4 border-t border-gray-50', className)} {...props}>
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
export type { CardProps, CardHeaderProps, CardTitleProps, CardContentProps, CardFooterProps };
