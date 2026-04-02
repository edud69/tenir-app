'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      // Successfully signed in, redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('loginTitle')}</h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('email')}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />

        <Input
          label={t('password')}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />

        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          variant="primary"
          size="lg"
        >
          {t('login')}
        </Button>
      </form>

      {/* Forgot Password Link */}
      <div className="text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-tenir-600 hover:text-tenir-700 font-medium"
        >
          {t('forgotPassword')}
        </Link>
      </div>

      {/* Sign Up Link */}
      <div className="text-center border-t pt-6">
        <p className="text-gray-600 text-sm mb-2">
          {t('noAccount')}{' '}
          <span className="text-gray-400">{t('or')}</span>
        </p>
        <Link href="/signup">
          <Button variant="outline" fullWidth>
            {t('signup')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
