import Link from "next/link";
import { Lock } from "lucide-react";

export default function RestrictedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Restricted</h1>
        <p className="text-gray-600 mb-6">
          Your account is either pending activation or has been deactivated. Please
          contact an administrator for assistance.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
