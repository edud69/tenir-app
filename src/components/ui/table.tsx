'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /**
   * Whether to show alternating row colors
   */
  striped?: boolean;
  /**
   * Whether to show hover effect on rows
   */
  hoverable?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ striped = false, hoverable = true, className, children, ...props }, ref) => (
    <div className="w-full overflow-x-auto border border-gray-200 rounded-lg">
      <table
        ref={ref}
        className={cn('w-full border-collapse', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
);

Table.displayName = 'Table';

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('bg-gray-50 border-b border-gray-200', className)}
      {...props}
    >
      {children}
    </thead>
  )
);

TableHeader.displayName = 'TableHeader';

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => (
    <tbody ref={ref} className={cn('', className)} {...props}>
      {children}
    </tbody>
  )
);

TableBody.displayName = 'TableBody';

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /**
   * Whether this row is striped
   */
  striped?: boolean;
  /**
   * Whether this row is hoverable
   */
  hoverable?: boolean;
  /**
   * Whether this is a header row
   */
  isHeader?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  (
    {
      striped = false,
      hoverable = true,
      isHeader = false,
      className,
      children,
      ...props
    },
    ref
  ) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-gray-200',
        striped && 'odd:bg-white even:bg-gray-50',
        hoverable && !isHeader && 'hover:bg-tenir-50 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
);

TableRow.displayName = 'TableRow';

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'px-4 py-3 text-left text-sm font-semibold text-gray-900 bg-gray-50',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
);

TableHead.displayName = 'TableHead';

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /**
   * Optional alignment
   */
  align?: 'left' | 'center' | 'right';
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ align = 'left', className, children, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'px-4 py-3 text-sm text-gray-700',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
);

TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
export type { TableProps, TableHeaderProps, TableBodyProps, TableRowProps, TableHeadProps, TableCellProps };
