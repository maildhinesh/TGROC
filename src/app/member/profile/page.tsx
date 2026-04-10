"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Input, Spinner } from "@/components/ui";
import { profileSchema, ProfileInput, familyMemberSchema, FamilyMemberInput, changePasswordSchema, ChangePasswordInput } from "@/lib/validations";
import { formatDate, getMembershipLabel } from "@/lib/utils";
import { Save, Plus, Trash2, X, Lock, Pencil } from "lucide-react";

interface FamilyMember {
  id: string;
  relationship: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
}

export default function MemberProfilePage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const membershipType = session?.user?.membershipType as string | undefined;

  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [membershipInfo, setMembershipInfo] = useState<{
    type: string | null;
    expiry: string | null;
  }>({ type: null, expiry: null });
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [isAddingFamily, setIsAddingFamily] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [editFamilyError, setEditFamilyError] = useState<string | null>(null);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

  const isFamilyMembership =
    membershipType === "FAMILY" || membershipType === "STUDENT_FAMILY";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerFamily,
    handleSubmit: handleSubmitFamily,
    reset: resetFamily,
    formState: { errors: familyErrors },
  } = useForm<FamilyMemberInput>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: { relationship: "CHILD" },
  });

  const {
    register: registerEditFamily,
    handleSubmit: handleSubmitEditFamily,
    reset: resetEditFamily,
    formState: { errors: editFamilyErrors },
  } = useForm<FamilyMemberInput>({
    resolver: zodResolver(familyMemberSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    if (!userId) return;
    setFetchError(null);
    fetch(`/api/users/${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then(({ user }) => {
        if (user?.profile) {
          reset({
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone ?? "",
            dateOfBirth: user.profile.dateOfBirth
              ? new Date(user.profile.dateOfBirth).getFullYear().toString()
              : "",
          });
        }
        setFamilyMembers(user?.familyMembers ?? []);
        setMembershipInfo({
          type: user?.membershipType ?? null,
          expiry: user?.membershipExpiry ?? null,
        });
        setIsFetching(false);
      })
      .catch((err) => {
        setFetchError(err.message ?? "Failed to load profile. Please refresh the page.");
        setIsFetching(false);
      });
  }, [userId, reset]);

  const onSubmit = async (data: ProfileInput) => {
    if (!userId) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: data }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSaveError(json.error ?? `Save failed (${res.status}). Please try again.`);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      setSaveError("Network error. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const onAddFamily = async (data: FamilyMemberInput) => {
    if (!userId) return;
    setIsAddingFamily(true);
    setFamilyError(null);

    const res = await fetch(`/api/users/${userId}/family`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    setIsAddingFamily(false);

    if (!res.ok) {
      setFamilyError(json.error ?? "Failed to add family member.");
    } else {
      setFamilyMembers((prev) => [...prev, json.member]);
      setShowAddFamily(false);
      resetFamily();
    }
  };

  const onChangePassword = async (data: ChangePasswordInput) => {
    if (!userId) return;
    setIsChangingPassword(true);
    setChangePasswordError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.currentPassword, password: data.newPassword }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setChangePasswordError(json.error ?? "Failed to change password. Please try again.");
      } else {
        setChangePasswordSuccess(true);
        resetPassword();
        setTimeout(() => setChangePasswordSuccess(false), 3000);
      }
    } catch {
      setChangePasswordError("Network error. Please check your connection and try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const removeFamilyMember = async (memberId: string) => {
    if (!userId) return;
    await fetch(`/api/users/${userId}/family/${memberId}`, { method: "DELETE" });
    setFamilyMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const startEditFamilyMember = (m: FamilyMember) => {
    setEditingMemberId(m.id);
    setEditFamilyError(null);
    resetEditFamily({
      relationship: m.relationship as "SPOUSE" | "CHILD",
      firstName: m.firstName,
      lastName: m.lastName,
      dateOfBirth: m.dateOfBirth ? new Date(m.dateOfBirth).getFullYear().toString() : "",
      email: m.email ?? "",
      phone: m.phone ?? "",
    });
  };

  const onEditFamily = async (data: FamilyMemberInput) => {
    if (!userId || !editingMemberId) return;
    setIsEditingFamily(true);
    setEditFamilyError(null);
    const res = await fetch(`/api/users/${userId}/family/${editingMemberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setIsEditingFamily(false);
    if (!res.ok) {
      setEditFamilyError(json.error ?? "Failed to update family member.");
    } else {
      setFamilyMembers((prev) =>
        prev.map((m) => (m.id === editingMemberId ? { ...m, ...json.member } : m))
      );
      setEditingMemberId(null);
    }
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
      <div className="max-w-2xl space-y-6">
        <PageHeader title="My Profile" description="Manage your personal information." />

        {fetchError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ✗ {fetchError}
          </div>
        )}

        {/* Membership info (read-only) */}
        {(membershipInfo.type || membershipInfo.expiry) && (
          <Card title="Membership Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {membershipInfo.type && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">Membership Type</p>
                  <p className="text-sm text-gray-800">{getMembershipLabel(membershipInfo.type)}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">Membership Expiry</p>
                <p className="text-sm text-gray-800">
                  {membershipInfo.expiry
                    ? formatDate(membershipInfo.expiry)
                    : <span className="text-gray-300">Not set</span>}
                </p>
              </div>
            </div>
          </Card>
        )}

        {saveSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✓ Profile updated successfully.
          </div>
        )}

        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ✗ {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card
            title="Personal Details"
            description="Update your name, date of birth, and phone number."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  required
                  {...register("firstName")}
                  error={errors.firstName?.message}
                />
                <Input
                  label="Last Name"
                  required
                  {...register("lastName")}
                  error={errors.lastName?.message}
                />
              </div>
              <Input
                label="Year of Birth"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                placeholder="e.g. 1985"
                {...register("dateOfBirth")}
                hint="Optional"
              />
              <Input
                label="Phone Number"
                type="tel"
                {...register("phone")}
                placeholder="+1 (555) 000-0000"
              />
              <div className="pt-2 flex justify-end">
                <Button type="submit" isLoading={isSaving}>
                  <Save className="w-4 h-4" />
                  Save Profile
                </Button>
              </div>
            </div>
          </Card>
        </form>

        {/* Change Password */}
        <form onSubmit={handleSubmitPassword(onChangePassword)}>
          <Card title="Change Password" description="Update your account password.">
            <div className="space-y-4">
              {changePasswordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  ✓ Password updated successfully.
                </div>
              )}
              {changePasswordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  ✗ {changePasswordError}
                </div>
              )}
              <Input
                label="Current Password"
                type="password"
                required
                {...registerPassword("currentPassword")}
                error={passwordErrors.currentPassword?.message}
              />
              <Input
                label="New Password"
                type="password"
                required
                {...registerPassword("newPassword")}
                error={passwordErrors.newPassword?.message}
                hint="Minimum 8 characters"
              />
              <Input
                label="Confirm New Password"
                type="password"
                required
                {...registerPassword("confirmPassword")}
                error={passwordErrors.confirmPassword?.message}
              />
              <div className="pt-2 flex justify-end">
                <Button type="submit" isLoading={isChangingPassword}>
                  <Lock className="w-4 h-4" />
                  Update Password
                </Button>
              </div>
            </div>
          </Card>
        </form>

        {/* Family Members */}
        {isFamilyMembership && (
          <div id="family">
            <Card
              title="Family Members"
              description="Manage your spouse and children registered under your family membership."
            >
              {familyMembers.length > 0 && (
                <div className="mb-4 space-y-2">
                  {familyMembers.map((m) =>
                    editingMemberId === m.id ? (
                      <form
                        key={m.id}
                        onSubmit={handleSubmitEditFamily(onEditFamily)}
                        className="border border-indigo-200 rounded-xl p-4 space-y-3 bg-indigo-50/40"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-800 text-sm">Edit Family Member</h4>
                          <button
                            type="button"
                            onClick={() => { setEditingMemberId(null); setEditFamilyError(null); }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {editFamilyError && (
                          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{editFamilyError}</p>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Relationship <span className="text-red-500">*</span>
                          </label>
                          <select
                            {...registerEditFamily("relationship")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="SPOUSE">Spouse</option>
                            <option value="CHILD">Child</option>
                          </select>
                          {editFamilyErrors.relationship && (
                            <p className="mt-1 text-xs text-red-600">{editFamilyErrors.relationship.message}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="First Name"
                            required
                            {...registerEditFamily("firstName")}
                            error={editFamilyErrors.firstName?.message}
                          />
                          <Input
                            label="Last Name"
                            required
                            {...registerEditFamily("lastName")}
                            error={editFamilyErrors.lastName?.message}
                          />
                        </div>
                        <Input
                          label="Year of Birth"
                          type="number"
                          min={1900}
                          max={new Date().getFullYear()}
                          placeholder="e.g. 1985"
                          {...registerEditFamily("dateOfBirth")}
                          hint="Optional"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Email (optional)"
                            type="email"
                            {...registerEditFamily("email")}
                            error={editFamilyErrors.email?.message}
                          />
                          <Input
                            label="Phone (optional)"
                            type="tel"
                            {...registerEditFamily("phone")}
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => { setEditingMemberId(null); setEditFamilyError(null); }}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" type="submit" isLoading={isEditingFamily}>
                            <Save className="w-3.5 h-3.5" />
                            Save
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm">
                            {m.firstName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {m.firstName} {m.lastName}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {m.relationship.toLowerCase()}
                              {m.dateOfBirth ? ` · Born ${new Date(m.dateOfBirth).getFullYear()}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditFamilyMember(m)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                            type="button"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFamilyMember(m.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove"
                            type="button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {!showAddFamily ? (
                <Button
                  variant="secondary"
                  onClick={() => setShowAddFamily(true)}
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                  Add Family Member
                </Button>
              ) : (
                <form
                  onSubmit={handleSubmitFamily(onAddFamily)}
                  className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-800">Add Family Member</h4>
                    <button
                      type="button"
                      onClick={() => { setShowAddFamily(false); setFamilyError(null); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {familyError && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{familyError}</p>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...registerFamily("relationship")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="SPOUSE">Spouse</option>
                      <option value="CHILD">Child</option>
                    </select>
                    {familyErrors.relationship && (
                      <p className="mt-1 text-xs text-red-600">
                        {familyErrors.relationship.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="First Name"
                      required
                      {...registerFamily("firstName")}
                      error={familyErrors.firstName?.message}
                    />
                    <Input
                      label="Last Name"
                      required
                      {...registerFamily("lastName")}
                      error={familyErrors.lastName?.message}
                    />
                  </div>
                  <Input
                    label="Year of Birth"
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    placeholder="e.g. 1985"
                    {...registerFamily("dateOfBirth")}
                    hint="Optional"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Email (optional)"
                      type="email"
                      {...registerFamily("email")}
                      error={familyErrors.email?.message}
                    />
                    <Input
                      label="Phone (optional)"
                      type="tel"
                      {...registerFamily("phone")}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => { setShowAddFamily(false); setFamilyError(null); }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" type="submit" isLoading={isAddingFamily}>
                      Add Member
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
