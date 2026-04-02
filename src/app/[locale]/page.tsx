import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const t = useTranslations();

  const features = [
    {
      icon: '📸',
      titleKey: 'landing.features.receipts.title',
      descKey: 'landing.features.receipts.desc',
    },
    {
      icon: '💰',
      titleKey: 'landing.features.expenses.title',
      descKey: 'landing.features.expenses.desc',
    },
    {
      icon: '📊',
      titleKey: 'landing.features.taxes.title',
      descKey: 'landing.features.taxes.desc',
    },
    {
      icon: '📝',
      titleKey: 'landing.features.forms.title',
      descKey: 'landing.features.forms.desc',
    },
    {
      icon: '🤖',
      titleKey: 'landing.features.assistant.title',
      descKey: 'landing.features.assistant.desc',
    },
    {
      icon: '🔐',
      titleKey: 'landing.features.security.title',
      descKey: 'landing.features.security.desc',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-tenir-50 via-white to-accent-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-tenir-600">tenir.app</h1>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost">{t('auth.login')}</Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary">{t('auth.signup')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          {t('common.appName')}
        </h2>
        <p className="text-xl md:text-2xl text-gray-600 mb-4">
          {t('common.tagline')}
        </p>
        <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
          Stop spending hours on accounting. Automate receipt scanning, expense
          tracking, and tax calculations for your holding company.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" variant="primary" className="px-8">
              {t('auth.signup')}
            </Button>
          </Link>
          <button className="text-tenir-600 hover:text-tenir-700 font-medium">
            Watch demo ↓
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container max-w-6xl mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why tenir.app?
        </h3>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Receipt Scanning */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">📸</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              Smart Receipt Scanning
            </h4>
            <p className="text-gray-600">
              Upload receipts via email, Google Drive, or mobile. AI automatically
              extracts vendor, amount, date, and tax information.
            </p>
          </div>

          {/* Expense Tracking */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">💰</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              Expense Tracking
            </h4>
            <p className="text-gray-600">
              Track expenses, revenue, dividends, and capital gains. Automatically
              categorize transactions and generate reports.
            </p>
          </div>

          {/* Tax Projections */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">📊</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              Tax Projections
            </h4>
            <p className="text-gray-600">
              Real-time tax calculations for federal and provincial rates.
              Estimate installments and optimize your tax strategy.
            </p>
          </div>

          {/* Form Generation */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">📝</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              Form Generation
            </h4>
            <p className="text-gray-600">
              Auto-generate government forms (T2, CO-17, T5, RL-3) with
              pre-filled data. Ready for online submission.
            </p>
          </div>

          {/* AI Assistant */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">🤖</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              AI Assistant
            </h4>
            <p className="text-gray-600">
              Get instant answers to accounting questions. Discuss tax strategy,
              deductions, and dividend planning.
            </p>
          </div>

          {/* Security */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-tenir-300 transition">
            <div className="text-4xl mb-4">🔐</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              Enterprise Security
            </h4>
            <p className="text-gray-600">
              End-to-end encryption, SOC 2 compliance, and automatic backups.
              Your data is always protected.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-tenir-600 text-white py-20">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-4">
            Ready to simplify your accounting?
          </h3>
          <p className="text-xl text-tenir-100 mb-8">
            Join holding company owners who save hours every week with tenir.app
          </p>

          <Link href="/signup">
            <Button size="lg" variant="secondary" className="px-8">
              Get Started Free
            </Button>
          </Link>

          <p className="text-tenir-100 text-sm mt-6">
            No credit card required. 14-day free trial.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-gray-900 mb-4">tenir.app</h4>
              <p className="text-sm text-gray-600">
                Simplified accounting for holding companies
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-tenir-600">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-tenir-600">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-tenir-600">
                    Security
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-tenir-600">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-tenir-600">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-tenir-600">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-tenir-600">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-tenir-600">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
            <p>&copy; 2026 tenir.app. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
