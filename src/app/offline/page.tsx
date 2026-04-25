export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <section className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">You are offline</h1>
        <p className="mt-3 text-sm text-gray-600">
          The TGROC Member Portal is not reachable right now. Please check your
          internet connection and try again.
        </p>
      </section>
    </main>
  );
}