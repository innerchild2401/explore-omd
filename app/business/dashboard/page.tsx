import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function BusinessDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Get business
  const { data: business } = await supabase
    .from('businesses')
    .select('slug, omd_id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!business) {
    redirect('/admin/login');
  }

  // Get OMD to redirect to proper URL
  const { data: omd } = await supabase
    .from('omds')
    .select('slug')
    .eq('id', business.omd_id)
    .single();

  if (!omd) {
    redirect('/admin/login');
  }

  // Redirect to new business dashboard URL
  redirect(`/${omd.slug}/business/${business.slug}`);
}
