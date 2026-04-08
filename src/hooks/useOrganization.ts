'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useOrganization() {
  const supabase = createClient();
  const [org, setOrg] = useState<any>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUser(user);

        const { data, error } = await (supabase as any)
          .from('organization_members')
          .select('organization_id, organizations(*)')
          .eq('user_id', user.id)
          .single();

        if (error || !data) { setError('No organization found'); setLoading(false); return; }
        setOrgId(data.organization_id);
        setOrg(data.organizations);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { org, orgId, user, loading, error };
}
