import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SectionsList from '@/components/admin/SectionsList';

export default async function AdminSectionsPage() {
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

  if (!profile?.omd_id) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold">Manage Sections</h1>
        <div className="rounded-lg bg-yellow-50 p-6">
          <p className="text-yellow-800">
            Please select an OMD to manage sections.
          </p>
        </div>
      </div>
    );
  }

  // Fetch OMD
  const { data: omd } = await supabase
    .from('omds')
    .select('*')
    .eq('id', profile.omd_id)
    .single();

  // Fetch all sections (including hidden)
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .eq('omd_id', profile.omd_id)
    .order('order_index');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Sections</h1>
          <p className="mt-2 text-gray-600">
            {omd?.name} - Edit, reorder, and toggle visibility of homepage sections
          </p>
        </div>
        <button className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
          + Add Section
        </button>
      </div>

      <SectionsList sections={sections || []} omdId={profile.omd_id} />
    </div>
  );
}

