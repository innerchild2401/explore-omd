import { cookies } from 'next/headers';

interface AdminProfile {
  role: string;
  omd_id: string | null;
}

const COOKIE_NAME = 'admin-active-omd';

export async function getActiveOmdId(profile: AdminProfile | null): Promise<string | null> {
  if (!profile) {
    return null;
  }

  if (profile.role !== 'super_admin') {
    return profile.omd_id ?? null;
  }

  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}







