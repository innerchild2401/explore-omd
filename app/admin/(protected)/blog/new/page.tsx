import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BlogPostEditor from '@/components/admin/BlogPostEditor';

export default async function NewBlogPostPage() {
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

  // Only super admin can access blog
  if (profile?.role !== 'super_admin') {
    redirect('/admin');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">New Blog Post</h1>
        <p className="mt-2 text-gray-600">
          Create a new marketing blog post
        </p>
      </div>

      <BlogPostEditor authorId={user.id} />
    </div>
  );
}


