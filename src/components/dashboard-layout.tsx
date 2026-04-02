"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  MapPin,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";
import { cn, getRoleLabel } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

// Defined at module scope so JSX element objects are created once, not on every render.
// React 19's reconciler detects new object references and throws
// "The children should not have changed if we pass in the same set."
const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/admin/users", label: "Users", icon: <Users className="w-5 h-5" /> },
  { href: "/events/manage", label: "Events", icon: <CalendarDays className="w-5 h-5" /> },
  { href: "/fees", label: "Membership Fees", icon: <DollarSign className="w-5 h-5" /> },
  { href: "/admin/profile", label: "My Profile", icon: <UserCircle className="w-5 h-5" /> },
];

const OFFICER_NAV: NavItem[] = [
  { href: "/officer", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/officer/members", label: "Members", icon: <Users className="w-5 h-5" /> },
  { href: "/events/manage", label: "Events", icon: <CalendarDays className="w-5 h-5" /> },
  { href: "/fees", label: "Membership Fees", icon: <DollarSign className="w-5 h-5" /> },
  { href: "/officer/profile", label: "My Profile", icon: <UserCircle className="w-5 h-5" /> },
];

const MEMBER_NAV: NavItem[] = [
  { href: "/member", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/member/events", label: "Events", icon: <CalendarDays className="w-5 h-5" /> },
  { href: "/member/profile", label: "Profile", icon: <UserCircle className="w-5 h-5" /> },
  { href: "/member/contact", label: "Contact Info", icon: <MapPin className="w-5 h-5" /> },
  { href: "/member/notifications", label: "Notifications", icon: <Bell className="w-5 h-5" /> },
];

function getNavItems(role: string): NavItem[] {
  if (role === "ADMIN") return ADMIN_NAV;
  if (role === "OFFICE_BEARER") return OFFICER_NAV;
  return MEMBER_NAV;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const role = session?.user?.role ?? "MEMBER";
  const navItems = getNavItems(role);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-blue-900 text-white flex flex-col transition-transform duration-200",
          "lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-900 font-bold">T</span>
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">TGROC</p>
              <p className="text-xs text-blue-300">Member Portal</p>
            </div>
          </div>
          <button
            className="lg:hidden text-blue-300 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 py-3 border-b border-blue-800">
          <span className="text-xs text-blue-300 uppercase tracking-wider">
            {getRoleLabel(role)}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin" || item.href === "/officer" || item.href === "/member"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-blue-800">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            className="lg:hidden p-1 rounded text-gray-600 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 lg:ml-0" />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm overflow-hidden">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (session?.user?.name?.[0] ?? "U").toUpperCase()
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800 leading-tight">
                  {session?.user?.name ?? "User"}
                </p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800">{session?.user?.name}</p>
                  <p className="text-xs text-gray-500">{getRoleLabel(role)}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
