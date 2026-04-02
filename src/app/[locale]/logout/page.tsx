import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface LogoutPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LogoutPage({ params }: LogoutPageProps) {
  const { locale } = await params;
  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();

  redirect(`/${locale}/login`);
}
