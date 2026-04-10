import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-tenir-500 flex items-center justify-center">
            <span className="text-white font-bold text-base">T</span>
          </div>
          <span className="font-semibold text-gray-900 text-lg tracking-tight">
            tenir<span className="text-tenir-600">.app</span>
          </span>
        </div>

        {/* 404 */}
        <p className="text-8xl font-black text-gray-100 leading-none mb-2 select-none">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Page introuvable</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>

        <Link
          href="/fr/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-tenir-600 hover:bg-tenir-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
