import React from 'react';

interface LogoProps {
  size?: number;
  variant?: 'full' | 'icon';
  className?: string;
}

export function Logo({ size = 32, variant = 'icon', className = '' }: LogoProps) {
  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <LogoIcon size={size} />
        <span
          style={{ fontSize: size * 0.65, lineHeight: 1 }}
          className="font-bold text-gray-900 tracking-tight"
        >
          tenir<span className="text-tenir-600">.app</span>
        </span>
      </div>
    );
  }
  return <LogoIcon size={size} className={className} />;
}

function LogoIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="40" height="40" rx="10" fill="#1a56db" />

      {/* T horizontal bar */}
      <rect x="7" y="10" width="26" height="5" rx="2.5" fill="white" />

      {/* T vertical stem */}
      <rect x="17.5" y="15" width="5" height="15" rx="2.5" fill="white" />

      {/* Ledger accent lines (right side) */}
      <rect x="25" y="20" width="8" height="2" rx="1" fill="white" opacity="0.45" />
      <rect x="25" y="25" width="6" height="2" rx="1" fill="white" opacity="0.35" />
      <rect x="25" y="30" width="7" height="2" rx="1" fill="white" opacity="0.25" />

      {/* Bottom accent bar */}
      <rect x="7" y="31" width="10" height="2" rx="1" fill="#93c5fd" opacity="0.7" />
    </svg>
  );
}
