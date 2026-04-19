"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Input, Badge, Spinner } from "@/components/ui";
import { ArrowLeft, Send, ImagePlus, X, Calendar, Phone, Clock, MapPin, Edit2, Save } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface MemberCoupon {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile: { firstName: string; lastName: string } | null;
  };
}

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
  status: "DRAFT" | "PUBLISHED" | "EXPIRED";
  memberCoupons: MemberCoupon[];
  _count: { memberCoupons: number };
}

const statusVariant: Record<string, "success" | "warning" | "danger" | "default"> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  EXPIRED: "danger",
  ACTIVE: "success",
  REDEEMED: "default",
};

function discountLabel(type: string, value: string) {
  return type === "PERCENTAGE"
    ? `${Number(value).toFixed(0)}% Off`
    : `$${Number(value).toFixed(2)} Off`;
}

export default function CouponDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const [isIssuingMissing, setIsIssuingMissing] = useState(false);
  const [issueMissingError, setIssueMissingError] = useState<string | null>(null);
  const [issueMissingSuccess, setIssueMissingSuccess] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [contactNumbers, setContactNumbers] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [description, setDescription] = useState("");

  // Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/coupons/${id}`)
      .then((r) => r.json())
      .then(({ coupon }) => {
        setCoupon(coupon);
        prefillEdit(coupon);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [id]);

  function prefillEdit(c: Coupon) {
    setTitle(c.title);
    setBusinessName(c.businessName);
    setBusinessAddress(c.businessAddress ?? "");
    setBusinessHours(c.businessHours ?? "");
    setContactNumbers(c.contactNumbers ?? "");
    setDiscountType(c.discountType);
    setDiscountValue(String(Number(c.discountValue)));
    setExpiryDate(new Date(c.expiryDate).toISOString().split("T")[0]);
    setDescription(c.description ?? "");
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  };

  const clearLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    setRemoveLogo(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const res = await fetch(`/api/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        businessName,
        businessAddress: businessAddress || null,
        businessHours: businessHours || null,
        contactNumbers: contactNumbers || null,
        discountType,
        discountValue: Number(discountValue),
        expiryDate,
        description: description || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setSaveError(json.error ?? "Save failed."); setIsSaving(false); return; }

    // Handle logo changes
    if (removeLogo && !logoFile) {
      await fetch(`/api/coupons/${id}/logo`, { method: "DELETE" });
      json.coupon.logoUrl = null;
    } else if (logoFile) {
      const fd = new FormData();
      fd.append("logo", logoFile);
      const logoRes = await fetch(`/api/coupons/${id}/logo`, { method: "POST", body: fd });
      const logoJson = await logoRes.json();
      json.coupon.logoUrl = logoJson.logoUrl;
    }

    setCoupon((prev) => prev ? { ...prev, ...json.coupon } : prev);
    setEditing(false);
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(false);
    setIsSaving(false);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError(null);
    const res = await fetch(`/api/coupons/${id}/publish`, { method: "POST" });
    const json = await res.json();
    setIsPublishing(false);
    if (!res.ok) {
      setPublishError(json.error ?? "Failed to publish.");
    } else {
      setPublishSuccess(`Coupon published! Issued to ${json.issued} member(s).`);
      // Refresh
      fetch(`/api/coupons/${id}`).then((r) => r.json()).then(({ coupon }) => setCoupon(coupon));
    }
  };

  const handleIssueMissing = async () => {
    setIsIssuingMissing(true);
    setIssueMissingError(null);
    setIssueMissingSuccess(null);
    const res = await fetch(`/api/coupons/${id}/issue-missing`, { method: "POST" });
    const json = await res.json();
    setIsIssuingMissing(false);
    if (!res.ok) {
      setIssueMissingError(json.error ?? "Failed to issue coupons.");
    } else if (json.issued === 0) {
      setIssueMissingSuccess("All active members already have this coupon.");
    } else {
      setIssueMissingSuccess(`Issued to ${json.issued} new member(s).`);
      fetch(`/api/coupons/${id}`).then((r) => r.json()).then(({ coupon }) => setCoupon(coupon));
    }
  };

  if (isLoading) return <DashboardLayout><div className="flex justify-center py-20"><Spinner /></div></DashboardLayout>;
  if (!coupon) return <DashboardLayout><p className="p-8 text-gray-500">Coupon not found.</p></DashboardLayout>;

  const currentLogoUrl = removeLogo ? null : (logoPreview ?? coupon.logoUrl);

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div className="mb-2">
          <Link href="/admin/coupons" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Coupons
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <PageHeader title={coupon.businessName} description={coupon.title} />
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <Badge variant={statusVariant[coupon.status]}>{coupon.status}</Badge>
              {coupon.status === "DRAFT" && (
                <Button variant="secondary" size="sm" onClick={() => { setEditing(!editing); setSaveError(null); if (!editing) prefillEdit(coupon); }}>
                  <Edit2 className="w-3.5 h-3.5" />{editing ? "Cancel" : "Edit"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Publish banner */}
        {coupon.status === "DRAFT" && !editing && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-800">Ready to publish?</p>
              <p className="text-sm text-amber-700 mt-0.5">Publishing will issue a unique coupon to every active member.</p>
            </div>
            <Button onClick={handlePublish} isLoading={isPublishing}>
              <Send className="w-4 h-4" /> Publish
            </Button>
          </div>
        )}
        {publishError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{publishError}</div>}
        {publishSuccess && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">✓ {publishSuccess}</div>}

        {/* Issue to new members banner — shown when coupon is already published */}
        {coupon.status === "PUBLISHED" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-blue-800">Issue to new members</p>
              <p className="text-sm text-blue-700 mt-0.5">Members who joined after this coupon was published won&apos;t have it yet. Issue it to them now.</p>
            </div>
            <Button variant="secondary" onClick={handleIssueMissing} isLoading={isIssuingMissing}>
              Issue to New Members
            </Button>
          </div>
        )}
        {issueMissingError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{issueMissingError}</div>}
        {issueMissingSuccess && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">✓ {issueMissingSuccess}</div>}

        {/* Edit form */}
        {editing ? (
          <form onSubmit={handleSave} className="space-y-5">
            <Card title="Business Details">
              <div className="space-y-4">
                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo</label>
                  {currentLogoUrl ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={currentLogoUrl} alt="Logo" className="w-32 h-32 object-contain rounded-xl border border-gray-200 bg-gray-50 p-2" />
                      <button type="button" onClick={clearLogo} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                      <ImagePlus className="w-4 h-4" /> Upload Logo
                    </button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleLogoChange} />
                </div>
                <Input label="Business Name" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                <Input label="Address" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} hint="Optional" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours</label>
                  <textarea value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <Input label="Contact Number(s)" value={contactNumbers} onChange={(e) => setContactNumbers(e.target.value)} hint="Optional" />
              </div>
            </Card>
            <Card title="Coupon Details">
              <div className="space-y-4">
                <Input label="Coupon Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <Input label={discountType === "PERCENTAGE" ? "Discount %" : "Discount $"} required type="number"
                    min={0.01} step={discountType === "PERCENTAGE" ? 1 : 0.01}
                    value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                </div>
                <Input label="Expiry Date" type="date" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                <div className="flex justify-end gap-3 pt-1">
                  <Button variant="secondary" type="button" onClick={() => { setEditing(false); setSaveError(null); }}>Cancel</Button>
                  <Button type="submit" isLoading={isSaving}><Save className="w-4 h-4" /> Save Changes</Button>
                </div>
              </div>
            </Card>
          </form>
        ) : (
          /* View mode */
          <Card title="Coupon Preview">
            <div className="flex flex-col sm:flex-row gap-6">
              {coupon.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coupon.logoUrl} alt={`${coupon.businessName} logo`}
                  className="w-28 h-28 object-contain shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-2 self-start" />
              )}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{discountLabel(coupon.discountType, coupon.discountValue)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{coupon.title}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  {coupon.businessAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <span>{coupon.businessAddress}</span>
                    </div>
                  )}
                  {coupon.businessHours && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <span className="whitespace-pre-line">{coupon.businessHours}</span>
                    </div>
                  )}
                  {coupon.contactNumbers && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{coupon.contactNumbers}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>Expires {formatDate(coupon.expiryDate)}</span>
                  </div>
                </div>
                {coupon.description && <p className="text-xs text-gray-500 pt-1">{coupon.description}</p>}
              </div>
            </div>
          </Card>
        )}

        {/* Issued coupons */}
        {coupon.status !== "DRAFT" && (
          <Card title={`Issued Coupons (${coupon._count.memberCoupons})`}>
            {coupon.memberCoupons.length === 0 ? (
              <p className="text-sm text-gray-500">No coupons issued yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="py-2 pr-4 font-semibold text-gray-600">Member</th>
                      <th className="py-2 pr-4 font-semibold text-gray-600">Coupon Code</th>
                      <th className="py-2 font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {coupon.memberCoupons.map((mc) => (
                      <tr key={mc.id}>
                        <td className="py-2 pr-4">
                          <p className="font-medium text-gray-900">
                            {mc.user.profile
                              ? `${mc.user.profile.firstName} ${mc.user.profile.lastName}`
                              : mc.user.email}
                          </p>
                          <p className="text-xs text-gray-400">{mc.user.email}</p>
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-indigo-700 tracking-wider">{mc.code}</td>
                        <td className="py-2">
                          <Badge variant={statusVariant[mc.status]}>{mc.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
