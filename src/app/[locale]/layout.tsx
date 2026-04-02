import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ReactNode } from 'react';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'tenir.app - Simplified accounting for your holding company',
    template: '%s | tenir.app',
  },
  description:
    'Simplified accounting for your holding company. Receipt scanning, expense tracking, tax projections, form generation, and AI assistant.',
  keywords: [
    'accounting',
    'holding company',
    'tax',
    'receipts',
    'expenses',
    'Quebec',
  ],
  authors: [{ name: 'tenir.app' }],
  creator: 'tenir.app',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tenir.app',
    siteName: 'tenir.app',
    title: 'tenir.app - Simplified accounting for your holding company',
    description:
      'Simplified accounting for your holding company. Receipt scanning, expense tracking, tax projections, form generation, and AI assistant.',
  },
};

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
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
