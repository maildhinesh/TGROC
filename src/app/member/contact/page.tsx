"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Input, Spinner } from "@/components/ui";
import { contactSchema, ContactInput } from "@/lib/validations";
import { Save, MapPin } from "lucide-react";

export default function ContactInfoPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then(({ user }) => {
        if (user?.contactInfo) {
          reset({
            address: user.contactInfo.address ?? "",
            city: user.contactInfo.city ?? "",
            state: user.contactInfo.state ?? "",
            zipCode: user.contactInfo.zipCode ?? "",
            country: user.contactInfo.country ?? "USA",
          });
        }
        setIsFetching(false);
      });
  }, [userId, reset]);

  const onSubmit = async (data: ContactInput) => {
    if (!userId) return;
    setIsSaving(true);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactInfo: data }),
    });
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (isFetching) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <PageHeader
          title="Contact Information"
          description="Keep your address and location details up to date."
        />

        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✓ Contact information updated successfully.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-800">Mailing Address</h3>
              </div>

              <Input
                label="Street Address"
                {...register("address")}
                placeholder="123 Main St, Apt 4B"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  {...register("city")}
                  placeholder="Toronto"
                />
                <Input
                  label="State / Province"
                  {...register("state")}
                  placeholder="Ontario"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="ZIP / Postal Code"
                  {...register("zipCode")}
                  placeholder="M5V 3A5"
                />
                <Input
                  label="Country"
                  {...register("country")}
                  placeholder="Canada"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" isLoading={isSaving}>
                  <Save className="w-4 h-4" />
                  Save Address
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
