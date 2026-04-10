'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><span>·</span>{msg}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

const inputCls = (hasError?: boolean) =>
  `w-full px-3.5 py-2.5 text-sm border rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tenir-500/30 focus:border-tenir-400 focus:bg-white transition-all disabled:opacity-50 ${
    hasError ? 'border-red-300 bg-red-50/30 focus:ring-red-400/30 focus:border-red-400' : 'border-gray-200'
  }`;

export default function SignupPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const locale = pathname.split('/')[1] || 'fr';

  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    companyName: '', neq: '', fiscalYearEnd: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) e.email = t('emailRequired');
    if (!formData.password || formData.password.length < 8) e.password = t('passwordMinLength');
    if (formData.password !== formData.confirmPassword) e.confirmPassword = t('passwordsDoNotMatch');
    if (!formData.companyName) e.companyName = t('companyRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email, password: formData.password,
          companyName: formData.companyName, neq: formData.neq,
          fiscalYearEnd: formData.fiscalYearEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('unexpectedError')); setIsLoading(false); return; }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
      if (signInError) { setError(signInError.message); setIsLoading(false); return; }
      router.push(`/${locale}/dashboard`);
    } catch {
      setError(t('unexpectedError'));
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('signupTitle')}</h2>
        <p className="text-sm text-gray-500 mt-1.5">
          {t('hasAccount')}{' '}
          <Link href={`/${locale}/login`} className="text-tenir-600 hover:text-tenir-700 font-medium transition-colors">
            {t('login')} →
          </Link>
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Account section */}
        <div className="space-y-3.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t('accountSection')}</p>

          <div>
            <Label required>{t('email')}</Label>
            <input name="email" type="email" placeholder="you@company.com" value={formData.email}
              onChange={handleChange} disabled={isLoading} className={inputCls(!!errors.email)} />
            <FieldError msg={errors.email} />
          </div>

          <div>
            <Label required>{t('password')}</Label>
            <div className="relative">
              <input name="password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={formData.password} onChange={handleChange} disabled={isLoading}
                className={`${inputCls(!!errors.password)} pr-10`} />
              <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPw
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
            <FieldError msg={errors.password} />
            {!errors.password && <p className="mt-1.5 text-xs text-gray-400">{t('passwordHint')}</p>}
          </div>

          <div>
            <Label required>{t('confirmPassword')}</Label>
            <input name="confirmPassword" type="password" placeholder="••••••••"
              value={formData.confirmPassword} onChange={handleChange} disabled={isLoading}
              className={inputCls(!!errors.confirmPassword)} />
            <FieldError msg={errors.confirmPassword} />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Company section */}
        <div className="space-y-3.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t('companySection')}</p>

          <div>
            <Label required>{t('companyName')}</Label>
            <input name="companyName" type="text" placeholder={t('companyPlaceholder')}
              value={formData.companyName} onChange={handleChange} disabled={isLoading}
              className={inputCls(!!errors.companyName)} />
            <FieldError msg={errors.companyName} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('neq')}</Label>
              <input name="neq" type="text" placeholder="Optional"
                value={formData.neq} onChange={handleChange} disabled={isLoading}
                className={inputCls()} />
            </div>
            <div>
              <Label>{t('fiscalYearEnd')}</Label>
              <input name="fiscalYearEnd" type="date"
                value={formData.fiscalYearEnd} onChange={handleChange} disabled={isLoading}
                className={inputCls()} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-tenir-600 hover:bg-tenir-500 active:bg-tenir-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-tenir-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {t('creatingAccount')}
            </>
          ) : t('signup')}
        </button>
      </form>
    </div>
  );
}
