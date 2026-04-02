'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Callback when the modal should close
   */
  onClose: () => void;
  /**
   * The title of the modal
   */
  title?: string;
  /**
   * The modal content
   */
  children: React.ReactNode;
  /**
   * Optional footer content
   */
  footer?: React.ReactNode;
  /**
   * Whether to show a close button in the header
   */
  showCloseButton?: boolean;
  /**
   * Whether clicking outside the modal closes it
   */
  closeOnBackdropClick?: boolean;
  /**
   * Size of the modal
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      footer,
      showCloseButton = true,
      closeOnBackdropClick = true,
      size = 'md',
    },
    ref
  ) => {
    const [mounted, setMounted] = React.useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      const handleBackdropClick = (e: MouseEvent) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }, [isOpen, onClose, closeOnBackdropClick]);

    if (!mounted || !isOpen) return null;

    const sizeClasses = {
      sm: 'w-full max-w-sm',
      md: 'w-full max-w-md',
      lg: 'w-full max-w-lg',
      xl: 'w-full max-w-2xl',
    };

    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-200"
        onClick={closeOnBackdropClick ? onClose : undefined}
      >
        <div
          ref={ref || modalRef}
          className={cn(
            'bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto',
            sizeClasses[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              {title && <h2 className="text-xl font-semibold text-gray-900">{title}</h2>}
              {!title && <div />}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Close modal"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }
);

Modal.displayName = 'Modal';

export { Modal };
export type { ModalProps };
