import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ContactInquiriesList from '@/components/admin/ContactInquiriesList';
import { getActiveOmdId } from '@/lib/admin/getActiveOmdId';

export default async function ContactInquiriesPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, omd_id')
    .eq('id', user.id)
    .single();

  // Only admins can access this page
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'omd_admin')) {
    redirect('/admin');
  }

  const activeOmdId = await getActiveOmdId(profile);

  // Fetch contact inquiries - filter depending on context
  let query = supabase
    .from('contact_inquiries')
    .select('*, omds!left(name, slug)')
    .order('created_at', { ascending: false });

  if (profile.role === 'super_admin') {
    if (activeOmdId) {
      query = query.eq('omd_id', activeOmdId);
    }
  } else if (profile.omd_id) {
    query = query.eq('omd_id', profile.omd_id);
  }

  const { data: inquiries } = await query;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Formulare de Contact</h1>
      <ContactInquiriesList inquiries={inquiries || []} />
    </div>
  );
}

