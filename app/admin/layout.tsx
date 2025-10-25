export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout is just a wrapper - auth checking happens in individual pages
  // or in a nested layout for protected routes
  return <>{children}</>;
}

