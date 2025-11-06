import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BookingIssuesList from '@/components/admin/BookingIssuesList';

export default async function BookingIssuesPage() {
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

  // Fetch booking issue reports
  let query = supabase
    .from('booking_issue_reports')
    .select(`
      *,
      reservations(
        confirmation_number,
        check_in_date,
        check_out_date,
        hotels(
          businesses(
            name,
            omd_id
          )
        )
      )
    `)
    .order('created_at', { ascending: false });

  const { data: allIssues } = await query;

  // Filter by OMD if not super admin (client-side filtering for nested data)
  const issues = profile.role === 'super_admin' 
    ? allIssues 
    : allIssues?.filter((issue: any) => {
        const omdId = issue.reservations?.hotels?.businesses?.omd_id;
        return omdId === profile.omd_id;
      }) || [];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Rapoarte Probleme Rezervări</h1>
      <BookingIssuesList issues={issues || []} />
    </div>
  );
}

