"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Spinner } from "@/components/ui";
import { Calendar, MapPin, Phone, Clock, Ticket, CheckCircle2 } from "lucide-react";

interface Coupon {
  id: string;
  title: string;
  businessName: string;
  businessAddress: string | null;
  businessHours: string | null;
  contactNumbers: string | null;
  logoUrl: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: string;
  expiryDate: string;
  description: string | null;
  status: string;
}

interface MemberCoupon {
  id: string;
  code: string;
  status: "ACTIVE" | "REDEEMED" | "EXPIRED";
  createdAt: string;
  coupon: Coupon;
}

function discountLabel(type: string, value: string) {
  return type === "PERCENTAGE"
    ? `${Number(value).toFixed(0)}% Off`
    : `$${Number(value).toFixed(2)} Off`;
}

function qrUrl(code: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(code)}&format=svg&color=1e3a8a&bgcolor=ffffff&margin=10`;
}

function CouponCard({ mc, onRedeem }: { mc: MemberCoupon; onRedeem: (id: string) => Promise<void> }) {
  const c = mc.coupon;
  const [confirming, setConfirming] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const isExpired =
    mc.status === "EXPIRED" ||
    mc.status === "REDEEMED" ||
    new Date(c.expiryDate) < new Date();

  const expiryFormatted = new Date(c.expiryDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${
        isExpired ? "border-gray-200 opacity-60" : "border-indigo-200 hover:shadow-md"
      }`}
    >
      {/* Header strip */}
      <div
        className={`px-5 py-3 flex items-center justify-between ${
          isExpired
            ? "bg-gray-100"
            : "bg-gradient-to-r from-indigo-600 to-purple-600"
        }`}
      >
        <span className={`text-xs font-bold uppercase tracking-widest ${isExpired ? "text-gray-400" : "text-white/80"}`}>
          {isExpired ? mc.status : "TGROC Member Coupon"}
        </span>
        {!isExpired && (
          <span className="text-xs text-white/70">Expires {expiryFormatted}</span>
        )}
      </div>

      <div className="p-5 flex flex-col sm:flex-row gap-5">
        {/* Left: business info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-3">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.logoUrl}
                alt={`${c.businessName} logo`}
                className="w-16 h-16 object-contain rounded-xl border border-gray-100 bg-gray-50 p-1 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Ticket className="w-7 h-7 text-indigo-300" />
              </div>
            )}
            <div>
              <p className="font-bold text-gray-900 text-lg leading-tight">{c.businessName}</p>
              <p className="text-indigo-700 font-semibold text-sm mt-0.5">{c.title}</p>
            </div>
          </div>

          {/* Discount highlight */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl">
            <span className="text-3xl font-extrabold text-indigo-700">
              {discountLabel(c.discountType, c.discountValue)}
            </span>
          </div>

          {/* Business details */}
          <div className="space-y-1.5 text-sm text-gray-600">
            {c.businessAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span>{c.businessAddress}</span>
              </div>
            )}
            {c.businessHours && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="whitespace-pre-line">{c.businessHours}</span>
              </div>
            )}
            {c.contactNumbers && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{c.contactNumbers}</span>
              </div>
            )}
            {isExpired && (
              <div className="flex items-center gap-2 text-red-500">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Expired {expiryFormatted}</span>
              </div>
            )}
          </div>

          {c.description && (
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">{c.description}</p>
          )}
        </div>

        {/* Right: QR code */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div
            className={`p-2 rounded-xl border-2 ${
              isExpired ? "border-gray-200 grayscale opacity-50" : "border-indigo-100"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl(mc.code)}
              alt={`QR code for coupon ${mc.code}`}
              width={140}
              height={140}
              className="rounded-lg"
            />
          </div>
          <p className="font-mono text-xs text-gray-500 tracking-wider text-center">{mc.code}</p>
          <p className="text-[10px] text-gray-400 text-center">Show QR code at store</p>
        </div>
      </div>

      {/* Redeem button — only for active coupons */}
      {!isExpired && (
        <div className="px-5 pb-5">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm tracking-wide transition-colors"
            >
              Redeem Coupon
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-center text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl py-2 px-3">
                Cashier: tap &ldquo;Confirm&rdquo; to mark this coupon as redeemed.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={redeeming}
                  className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setRedeeming(true);
                    await onRedeem(mc.id);
                    setRedeeming(false);
                    setConfirming(false);
                  }}
                  disabled={redeeming}
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {redeeming ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {redeeming ? "Redeeming…" : "Confirm Redemption"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MemberCouponsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [memberCoupons, setMemberCoupons] = useState<MemberCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED">("ACTIVE");

  async function handleRedeem(memberCouponId: string) {
    const res = await fetch(`/api/member-coupons/${memberCouponId}`, { method: "PATCH" });
    if (res.ok) {
      setMemberCoupons((prev) =>
        prev.map((mc) =>
          mc.id === memberCouponId
            ? { ...mc, status: "REDEEMED" as const }
            : mc
        )
      );
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (status === "authenticated") {
      fetch("/api/member-coupons")
        .then((r) => r.json())
        .then(({ memberCoupons }) => { setMemberCoupons(memberCoupons ?? []); setIsLoading(false); })
        .catch(() => setIsLoading(false));
    }
  }, [status, router]);

  if (isLoading || status === "loading") {
    return <DashboardLayout><div className="flex justify-center py-20"><Spinner /></div></DashboardLayout>;
  }

  const now = new Date();
  const filtered = memberCoupons.filter((mc) => {
    const expired = mc.status === "EXPIRED" || mc.status === "REDEEMED" || new Date(mc.coupon.expiryDate) < now;
    if (filter === "ACTIVE") return !expired;
    if (filter === "EXPIRED") return expired;
    return true;
  });

  const activeCount = memberCoupons.filter(
    (mc) => mc.status === "ACTIVE" && new Date(mc.coupon.expiryDate) >= now
  ).length;

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <PageHeader
          title="My Coupons"
          description="Exclusive discounts from local businesses for TGROC members."
        />

        {/* Stats */}
        {memberCoupons.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <Ticket className="w-8 h-8 text-indigo-500 shrink-0" />
            <div>
              <p className="font-semibold text-indigo-900">
                You have <span className="text-indigo-600">{activeCount}</span> active{" "}
                {activeCount === 1 ? "coupon" : "coupons"}
              </p>
              <p className="text-sm text-indigo-600">Show the QR code at the store to redeem your discount.</p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {memberCoupons.length > 0 && (
          <div className="flex gap-2">
            {(["ACTIVE", "EXPIRED", "ALL"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
                }`}
              >
                {f === "ALL" ? "All" : f === "ACTIVE" ? "Active" : "Expired / Redeemed"}
              </button>
            ))}
          </div>
        )}

        {memberCoupons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No coupons yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Member discount coupons will appear here when issued.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No {filter.toLowerCase()} coupons.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((mc) => (
              <CouponCard key={mc.id} mc={mc} onRedeem={handleRedeem} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
