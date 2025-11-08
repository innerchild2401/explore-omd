export default function ExploreLoading() {
  return (
    <main className="min-h-screen bg-white animate-pulse">
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
          <div className="h-4 w-32 rounded-full bg-gray-200" />
        </div>
      </header>

      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="mx-auto mb-4 h-10 w-64 rounded-full bg-gray-200" />
          <div className="mx-auto h-4 w-3/4 rounded-full bg-gray-200" />
          <div className="mx-auto mt-4 h-4 w-1/2 rounded-full bg-gray-200" />
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 space-y-4 text-center">
            <div className="mx-auto h-4 w-40 rounded-full bg-gray-200" />
            <div className="mx-auto h-4 w-60 rounded-full bg-gray-200" />
          </div>

          <div className="flex space-x-6 overflow-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-80 w-80 flex-shrink-0 rounded-2xl bg-white shadow-md"
              >
                <div className="h-48 w-full rounded-t-2xl bg-gray-200" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 rounded-full bg-gray-200" />
                  <div className="h-3 w-full rounded-full bg-gray-200" />
                  <div className="h-3 w-2/3 rounded-full bg-gray-200" />
                  <div className="h-4 w-1/3 rounded-full bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 h-4 w-48 rounded-full bg-gray-200" />
          <div className="h-96 rounded-2xl border border-dashed border-gray-200" />
        </div>
      </section>
    </main>
  );
}

