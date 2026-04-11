"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Input } from "@/components/ui";
import { ArrowLeft, ImagePlus, X } from "lucide-react";

export default function NewCouponPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [contactNumbers, setContactNumbers] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [description, setDescription] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setServerError("Only JPEG and PNG images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setServerError("Logo must be 5 MB or smaller.");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setServerError(null);
  };

  const removeLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountValue || isNaN(Number(discountValue))) {
      setServerError("Please enter a valid discount value.");
      return;
    }
    setIsLoading(true);
    setServerError(null);

    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        businessName,
        businessAddress: businessAddress || undefined,
        businessHours: businessHours || undefined,
        contactNumbers: contactNumbers || undefined,
        discountType,
        discountValue: Number(discountValue),
        expiryDate,
        description: description || undefined,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setIsLoading(false);
      setServerError(json.error ?? "Failed to create coupon.");
      return;
    }

    const couponId = json.coupon.id;

    // Upload logo if provided
    if (logoFile) {
      const fd = new FormData();
      fd.append("logo", logoFile);
      await fetch(`/api/coupons/${couponId}/logo`, { method: "POST", body: fd });
    }

    setIsLoading(false);
    router.push(`/admin/coupons/${couponId}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link href="/admin/coupons" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Coupons
          </Link>
          <PageHeader title="New Coupon" description="Design a member discount coupon." />
        </div>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{serverError}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Business Info */}
          <Card title="Business Details">
            <div className="space-y-4">
              {/* Logo upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo</label>
                {logoPreview ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="Logo preview" className="w-32 h-32 object-contain rounded-xl border border-gray-200 bg-gray-50 p-2" />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" /> Upload Logo (JPEG/PNG, max 5 MB)
                  </button>
                )}
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleLogoChange} />
              </div>

              <Input label="Business Name" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Patel Brothers Grocery" />
              <Input label="Address" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="123 Main St, Rochester, NY 14607" hint="Optional" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span></label>
                <textarea
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder={"Mon–Fri: 9am–8pm\nSat–Sun: 10am–6pm"}
                />
              </div>
              <Input label="Contact Number(s)" value={contactNumbers} onChange={(e) => setContactNumbers(e.target.value)} placeholder="(585) 555-0100" hint="Optional" />
            </div>
          </Card>

          {/* Coupon Details */}
          <Card title="Coupon Details">
            <div className="space-y-4">
              <Input label="Coupon Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 10% Off Your Total Purchase" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type <span className="text-red-500">*</span></label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "PERCENTAGE" | "FIXED_AMOUNT")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                  </select>
                </div>
                <Input
                  label={discountType === "PERCENTAGE" ? "Discount %" : "Discount $"}
                  required
                  type="number"
                  min={0.01}
                  step={discountType === "PERCENTAGE" ? 1 : 0.01}
                  max={discountType === "PERCENTAGE" ? 100 : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "PERCENTAGE" ? "10" : "5.00"}
                />
              </div>

              <Input
                label="Expiry Date"
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Any terms, conditions, or additional information..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Link href="/admin/coupons">
                  <Button variant="secondary" type="button">Cancel</Button>
                </Link>
                <Button type="submit" isLoading={isLoading}>Create Coupon</Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
