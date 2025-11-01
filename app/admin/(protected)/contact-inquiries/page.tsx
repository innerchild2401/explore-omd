import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ContactInquiriesList from '@/components/admin/ContactInquiriesList';

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
    .select('role')
    .eq('id', user.id)
    .single();

  // Only super admins can access this page
  if (profile?.role !== 'super_admin') {
    redirect('/admin');
  }

  // Fetch all contact inquiries
  const { data: inquiries } = await supabase
    .from('contact_inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Contact Inquiries</h1>
      <ContactInquiriesList inquiries={inquiries || []} />
    </div>
  );
}

