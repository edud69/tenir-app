import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ReactNode } from 'react';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === 'fr';

  const title = isFr
    ? 'tenir.app - La comptabilité simplifiée pour votre société de portefeuille'
    : 'tenir.app - Simplified accounting for your holding company';
  const description = isFr
    ? 'La plateforme tout-en-un pour gérer votre comptabilité corporative au Québec. Numérisation de reçus, suivi des dépenses, projections fiscales, génération de formulaires et assistant IA.'
    : 'Simplified accounting for your holding company. Receipt scanning, expense tracking, tax projections, form generation, and AI assistant.';

  return {
    title: {
      default: title,
      template: '%s | tenir.app',
    },
    description,
    keywords: isFr
      ? ['comptabilité', 'société de portefeuille', 'impôt', 'reçus', 'dépenses', 'Québec']
      : ['accounting', 'holding company', 'tax', 'receipts', 'expenses', 'Quebec'],
    authors: [{ name: 'tenir.app' }],
    creator: 'tenir.app',
    openGraph: {
      type: 'website',
      locale: isFr ? 'fr_CA' : 'en_CA',
      url: 'https://tenir.app',
      siteName: 'tenir.app',
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
