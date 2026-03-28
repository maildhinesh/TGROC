import Link from "next/link";
import { Users, Shield, Bell, LogIn } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-blue-900 font-bold text-lg">T</span>
          </div>
          <span className="text-white font-bold text-xl">TGROC</span>
        </div>
        <Link
          href="/auth/login"
          className="flex items-center gap-2 bg-white text-blue-900 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Member Login
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
          Welcome to TGROC
          <br />
          <span className="text-blue-300">Member Portal</span>
        </h1>
        <p className="text-xl text-blue-200 mb-10 max-w-2xl mx-auto">
          Manage your membership, stay connected with our community, and access
          exclusive resources — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/login"
            className="bg-white text-blue-900 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-600 transition-colors border border-blue-500"
          >
            Become a Member
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Users className="w-8 h-8 text-blue-300" />}
            title="Membership Management"
            description="Individual, Family, Student — manage your membership type and keep your information current."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8 text-blue-300" />}
            title="Secure Access"
            description="Sign in with Google, Facebook, or your email. Your data is always safe and private."
          />
          <FeatureCard
            icon={<Bell className="w-8 h-8 text-blue-300" />}
            title="Stay Informed"
            description="Customize your notification preferences to receive updates about events and announcements."
          />
        </div>
      </section>

      {/* Membership Types */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Membership Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Individual", desc: "Single member" },
            { label: "Family", desc: "Member + Spouse + Kids" },
            { label: "Student (Individual)", desc: "Student single" },
            { label: "Student (Family)", desc: "Student + Family" },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-white/10 backdrop-blur rounded-xl p-5 text-center border border-white/20"
            >
              <p className="font-semibold text-white">{m.label}</p>
              <p className="text-sm text-blue-200 mt-1">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-blue-300 py-8 text-sm">
        © {new Date().getFullYear()} TGROC. All rights reserved.
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-blue-200">{description}</p>
    </div>
  );
}
