import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Props {
  params: { locale: string };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = params;

  // Redirect logged-in users straight to dashboard
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-tenir-50 via-white to-accent-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-tenir-600">tenir.app</h1>
          <div className="flex gap-3">
            <Link href={`/${locale}/login`}>
              <Button variant="ghost">Se connecter</Button>
            </Link>
            <Link href={`/${locale}/signup`}>
              <Button variant="primary">Créer un compte</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          tenir.app
        </h2>
        <p className="text-xl md:text-2xl text-gray-600 mb-4">
          La comptabilité simplifiée pour votre société de portefeuille
        </p>
        <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
          Téléversez vos reçus, suivez vos dépenses et revenus, calculez vos impôts corporatifs
          et générez vos formulaires gouvernementaux — le tout en français.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={`/${locale}/signup`}>
            <Button size="lg" variant="primary" className="px-8">
              Commencer gratuitement
            </Button>
          </Link>
          <Link href={`/${locale}/login`}>
            <Button size="lg" variant="outline" className="px-8">
              Se connecter
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container max-w-6xl mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Tout ce dont vous avez besoin
        </h3>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">📸</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Numérisation de reçus</h4>
            <p className="text-gray-600">
              Téléversez vos reçus par glisser-déposer. L&apos;IA extrait automatiquement
              le fournisseur, le montant, la date, la TPS et la TVQ.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">💰</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Suivi des dépenses</h4>
            <p className="text-gray-600">
              Suivez vos dépenses, revenus, dividendes et gains en capital.
              Catégorisez vos transactions et générez des rapports.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">📊</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Projections fiscales</h4>
            <p className="text-gray-600">
              Calculs d&apos;impôts fédéraux et québécois en temps réel.
              IMRTD, CDC, acomptes provisionnels — tout y est.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">📝</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Formulaires gouvernementaux</h4>
            <p className="text-gray-600">
              Générez automatiquement vos formulaires T2, CO-17, T5 et RL-3
              avec les données pré-remplies.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">🤖</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Assistant IA</h4>
            <p className="text-gray-600">
              Obtenez des réponses instantanées à vos questions de comptabilité.
              Planification fiscale, déductions, stratégie de dividendes.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">📈</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Portefeuille de placements</h4>
            <p className="text-gray-600">
              Suivez votre portefeuille, calculez le PBR, les gains non réalisés
              et les revenus de dividendes déterminés et non déterminés.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-tenir-600 text-white py-20">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-4">
            Prêt à simplifier votre comptabilité?
          </h3>
          <p className="text-xl text-tenir-100 mb-8">
            Conçu spécifiquement pour les sociétés de portefeuille québécoises.
          </p>
          <Link href={`/${locale}/signup`}>
            <Button size="lg" variant="secondary" className="px-8">
              Commencer gratuitement
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="container max-w-6xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>&copy; 2026 tenir.app. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
