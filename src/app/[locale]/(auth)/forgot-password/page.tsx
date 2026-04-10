'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setIsLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/reset-password`,
      });
      if (resetError) { setError(resetError.message); return; }
      setSent(true);
    } catch {
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Vérifiez vos courriels</h2>
          <p className="text-sm text-gray-500 mt-1.5">
            Si un compte existe pour <span className="font-medium text-gray-700">{email}</span>, vous recevrez un lien de réinitialisation sous peu.
          </p>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 mb-6">
          Vérifiez aussi votre dossier courrier indésirable.
        </div>
        <Link
          href={`/${locale}/login`}
          className="text-sm text-tenir-600 hover:text-tenir-700 font-medium transition-colors"
        >
          ← Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Réinitialiser le mot de passe</h2>
        <p className="text-sm text-gray-500 mt-1.5">
          Entrez votre courriel et nous vous enverrons un lien de réinitialisation.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Courriel</label>
          <input
            type="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tenir-500/30 focus:border-tenir-400 focus:bg-white transition-all disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-tenir-600 hover:bg-tenir-500 active:bg-tenir-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-tenir-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Envoi en cours...
            </>
          ) : 'Envoyer le lien de réinitialisation'}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500">
        <Link href={`/${locale}/login`} className="text-tenir-600 hover:text-tenir-700 font-medium transition-colors">
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
