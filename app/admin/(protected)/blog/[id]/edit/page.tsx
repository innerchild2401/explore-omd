import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BlogPostEditor from '@/components/admin/BlogPostEditor';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const { id } = params;
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

  // Fetch the post
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (!post) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Blog Post</h1>
        <p className="mt-2 text-gray-600">
          Edit: {post.title}
        </p>
      </div>

      <BlogPostEditor post={post} authorId={user.id} />
    </div>
  );
}


