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
          <h1 className="text-3xl font-bold text-gray-900">Manage Sections</h1>
          <p className="mt-2 text-gray-600">
            {omd?.name} - Edit, reorder, and toggle visibility of homepage sections
          </p>
        </div>
        <button className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 shadow-sm">
          + Add Section
        </button>
      </div>

      {/* Image Guidelines */}
      <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <h3 className="mb-2 font-semibold text-blue-900">📸 Image Guidelines for Beautiful Homepage</h3>
        <div className="grid gap-3 text-sm text-blue-800 md:grid-cols-2">
          <div>
            <strong>Hero Background:</strong> 1920×1080px minimum (16:9 landscape)
          </div>
          <div>
            <strong>Business Images (Hotels/Restaurants/Experiences):</strong>
          </div>
          <div className="md:col-span-2 ml-4">
            • <strong>Quantity:</strong> 3-8 images per business (first image is the main carousel thumbnail)
            <br />
            • <strong>Size:</strong> 1200×800px recommended (3:2 aspect ratio)
            <br />
            • <strong>Format:</strong> JPG or WebP for best quality and performance
            <br />
            • <strong>Tip:</strong> Mix exterior, interior, and detail shots for variety
          </div>
        </div>
      </div>

      <SectionsList sections={sections || []} omdId={profile.omd_id} />
    </div>
  );
}

