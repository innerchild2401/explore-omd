'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: {
    omdSlug: string;
  };
}

export default function RegisterBusinessPage({ params }: PageProps) {
  const { omdSlug } = params;
  const router = useRouter();

  useEffect(() => {
    // Redirect to new business signup page
    router.push(`/${omdSlug}/business/signup`);
  }, [router, omdSlug]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center text-gray-600">Redirecting...</div>
    </div>
  );
}
