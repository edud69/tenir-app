import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="gradient-auth min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-tenir-600">tenir.app</h1>
          <p className="mt-2 text-gray-600 text-sm">
            Simplified accounting for your holding company
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-xl shadow-md p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
