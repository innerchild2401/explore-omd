import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SectionsList from '@/components/admin/SectionsList';
import { DEFAULT_TEMPLATE, TemplateName } from '@/lib/omdTemplates';
import { getActiveOmdId } from '@/lib/admin/getActiveOmdId';

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

  const isSuperAdmin = profile?.role === 'super_admin';
  const activeOmdId = await getActiveOmdId(profile);

  if (!activeOmdId) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold">Manage Sections</h1>
        <div className="rounded-lg bg-yellow-50 p-6">
          <p className="text-yellow-800">
            {isSuperAdmin
              ? 'Select a destination from the dropdown to manage its sections.'
              : 'Please select an OMD to manage sections.'}
          </p>
        </div>
      </div>
    );
  }

  // Fetch OMD
  const { data: omd } = await supabase
    .from('omds')
    .select('*, settings')
    .eq('id', activeOmdId)
    .single();

  // Fetch all sections (including hidden)
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .eq('omd_id', activeOmdId)
    .order('order_index');

  const template = ((omd?.settings ?? {}).template as TemplateName) ?? DEFAULT_TEMPLATE;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Sections</h1>
          <p className="mt-2 text-gray-600">
            {omd?.name} - Edit, reorder, and toggle visibility of homepage sections
          </p>
        </div>
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

      <SectionsList
        sections={sections || []}
        omdId={activeOmdId}
        omdName={omd?.name ?? ''}
        initialTemplate={template}
        settings={omd?.settings ?? {}}
        canEditTemplate={isSuperAdmin}
      />
    </div>
  );
}

