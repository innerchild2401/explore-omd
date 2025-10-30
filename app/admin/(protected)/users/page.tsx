import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

type ManagedBusiness = {
  id: string;
  name: string;
  type: string;
  status: string;
};

type UserRow = {
  id: string;
  role: string;
  profile: Record<string, any> | null;
  businesses?: ManagedBusiness[];
};

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: currentProfile } = await supabase
    .from('user_profiles')
    .select('role, omd_id')
    .eq('id', user.id)
    .single();

  if (!currentProfile || !['super_admin', 'omd_admin'].includes(currentProfile.role)) {
    redirect('/admin/login?message=You do not have admin access');
  }

  if (!currentProfile.omd_id) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold">Users</h1>
        <div className="rounded-lg bg-yellow-50 p-6 text-yellow-800">
          Please assign your account to an OMD to view users.
        </div>
      </div>
    );
  }

  // Fetch users in the same OMD with businesses they manage (via businesses.owner_id)
  const { data: users } = await supabase
    .from('user_profiles')
    .select(`
      id,
      role,
      profile,
      businesses:businesses!businesses_owner_id_fkey (
        id,
        name,
        type,
        status
      )
    `)
    .eq('omd_id', currentProfile.omd_id)
    .order('created_at', { ascending: false }) as unknown as { data: UserRow[] | null };

  const rows: UserRow[] = Array.isArray(users) ? (users as unknown as UserRow[]) : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Businesses Managed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((u) => {
              const name = (u.profile && (u.profile as any).name) || '—';
              const email = (u.profile && (u.profile as any).email) || '—';
              const phone = (u.profile && (u.profile as any).phone) || '—';
              const businesses = Array.isArray(u.businesses) ? u.businesses : [];

              return (
                <tr key={u.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.role}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {businesses.length === 0 ? (
                      <span>—</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {businesses.map((b) => (
                          <span
                            key={b.id}
                            className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                          >
                            <span>{b.name}</span>
                            <span className="text-gray-400">({b.type})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-6 text-sm text-gray-500">No users found for this OMD.</div>
        )}
      </div>
    </div>
  );
}


