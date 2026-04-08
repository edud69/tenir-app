'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    neq: '',
    fiscalYearEnd: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.companyName) {
      errors.companyName = 'Company name is required';
    }

    if (!formData.fiscalYearEnd) {
      errors.fiscalYearEnd = 'Fiscal year end is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Create Supabase user
      const { data: authData, error: signUpError } =
        await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

      if (signUpError || !authData.user) {
        setError(signUpError?.message || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      const userId = authData.user.id;

      // Create organization
      const { data: orgData, error: orgError } = await (supabase as any)
        .from('organizations')
        .insert({
          name: formData.companyName,
          neq: formData.neq || null,
          fiscal_year_end: formData.fiscalYearEnd,
        })
        .select('id')
        .single();

      if (orgError || !orgData) {
        setError('Failed to create organization');
        setIsLoading(false);
        return;
      }

      // Create organization membership
      const { error: memberError } = await (supabase as any)
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: userId,
          role: 'owner',
        });

      if (memberError) {
        setError('Failed to set up organization membership');
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard
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
        <h2 className="text-2xl font-bold text-gray-900">
          {t('signupTitle')}
        </h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <Input
          label={t('email')}
          type="email"
          name="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          error={validationErrors.email}
          required
          disabled={isLoading}
        />

        {/* Password */}
        <Input
          label={t('password')}
          type="password"
          name="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          error={validationErrors.password}
          helperText="At least 8 characters"
          required
          disabled={isLoading}
        />

        {/* Confirm Password */}
        <Input
          label={t('confirmPassword')}
          type="password"
          name="confirmPassword"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={validationErrors.confirmPassword}
          required
          disabled={isLoading}
        />

        {/* Company Name */}
        <Input
          label={t('companyName')}
          type="text"
          name="companyName"
          placeholder="Your Company Inc."
          value={formData.companyName}
          onChange={handleChange}
          error={validationErrors.companyName}
          required
          disabled={isLoading}
        />

        {/* NEQ */}
        <Input
          label={t('neq')}
          type="text"
          name="neq"
          placeholder="Optional"
          value={formData.neq}
          onChange={handleChange}
          disabled={isLoading}
          helperText="Optional"
        />

        {/* Fiscal Year End */}
        <Input
          label={t('fiscalYearEnd')}
          type="date"
          name="fiscalYearEnd"
          value={formData.fiscalYearEnd}
          onChange={handleChange}
          error={validationErrors.fiscalYearEnd}
          required
          disabled={isLoading}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          variant="primary"
          size="lg"
        >
          {t('signup')}
        </Button>
      </form>

      {/* Login Link */}
      <div className="text-center border-t pt-6">
        <p className="text-gray-600 text-sm mb-2">
          {t('hasAccount')}{' '}
          <span className="text-gray-400">{t('or')}</span>
        </p>
        <Link href="/login">
          <Button variant="outline" fullWidth>
            {t('login')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
