"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Badge, Button, Spinner } from "@/components/ui";
import { Plus, Ticket, Calendar, Trash2, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Coupon {
  id: string;
  title: string;
  businessName: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: string;
  expiryDate: string;
  status: "DRAFT" | "PUBLISHED" | "EXPIRED";
  _count: { memberCoupons: number };
}

const statusVariant: Record<string, "success" | "warning" | "danger" | "default"> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  EXPIRED: "danger",
};

function discountLabel(type: string, value: string) {
  if (type === "PERCENTAGE") return `${Number(value).toFixed(0)}% Off`;
  return `$${Number(value).toFixed(2)} Off`;
}

export default function AdminCouponsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (status === "authenticated") {
      if (!["ADMIN", "OFFICE_BEARER"].includes(session.user.role as string)) {
        router.push("/dashboard"); return;
      }
      fetch("/api/coupons")
        .then((r) => r.json())
        .then(({ coupons }) => { setCoupons(coupons ?? []); setIsLoading(false); })
        .catch(() => setIsLoading(false));
    }
  }, [status, session, router]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/coupons/${id}`, { method: "DELETE" });
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    setDeleteId(null);
  };

  if (isLoading || status === "loading") {
    return <DashboardLayout><div className="flex justify-center py-20"><Spinner /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl space-y-6">
        <PageHeader
          title="Coupons"
          description="Design and publish member discount coupons."
          action={
            <Link href="/admin/coupons/new">
              <Button><Plus className="w-4 h-4" /> New Coupon</Button>
            </Link>
          }
        />

        {coupons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No coupons yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first coupon to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Business</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Discount</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Expiry</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Issued</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.businessName}</p>
                      <p className="text-xs text-gray-400">{c.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-indigo-700">
                        {discountLabel(c.discountType, c.discountValue)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(c.expiryDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c._count.memberCoupons} members</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/admin/coupons/${c.id}`}>
                          <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        {deleteId === c.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >Confirm</button>
                            <button
                              onClick={() => setDeleteId(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(c.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
