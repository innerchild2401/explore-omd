import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BookingIssuesList from '@/components/admin/BookingIssuesList';
import { getActiveOmdId } from '@/lib/admin/getActiveOmdId';

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

  const activeOmdId = await getActiveOmdId(profile);

  if (!activeOmdId) {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-yellow-800">
        Select a destination to review booking issues.
      </div>
    );
  }

  // Fetch booking issue reports
  const { data: allIssues } = await supabase
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

  // Filter by selected OMD (client-side filtering for nested data)
  const issues =
    allIssues?.filter((issue: any) => {
      const omdId = issue.reservations?.hotels?.businesses?.omd_id;
      return omdId === activeOmdId;
    }) || [];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Rapoarte Probleme Rezervări</h1>
      <BookingIssuesList issues={issues || []} />
    </div>
  );
}

