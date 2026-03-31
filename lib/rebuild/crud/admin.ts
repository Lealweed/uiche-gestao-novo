import type { SupabaseClient } from "@supabase/supabase-js";

type CrudClient = SupabaseClient<any, "public", any>;

function throwIfError(error: { message?: string } | null | undefined) {
  if (error) throw new Error(error.message ?? "Operação não pôde ser concluída.");
}

async function toggleActive(
  supabase: CrudClient,
  table: string,
  field: string,
  value: string,
  active: boolean
) {
  const { error } = await supabase.from(table).update({ active }).eq(field, value);
  throwIfError(error);
}

export async function createCompanyRecord(supabase: CrudClient, name: string, commissionPercent: number) {
  let { error } = await supabase.from("companies").insert({ name, commission_percent: commissionPercent, active: true });

  if (error?.message?.toLowerCase().includes("commission_percent")) {
    const fallback = await supabase.from("companies").insert({ name, comission_percent: commissionPercent, active: true } as never);
    error = fallback.error;
  }

  throwIfError(error);
}

export async function createBoothRecord(supabase: CrudClient, code: string, name: string) {
  const { error } = await supabase.from("booths").insert({ code, name, active: true });
  throwIfError(error);
}

export async function createCategoryRecord(supabase: CrudClient, name: string) {
  const { error } = await supabase.from("transaction_categories").insert({ name, active: true });
  throwIfError(error);
}

export async function createSubcategoryRecord(supabase: CrudClient, categoryId: string, name: string) {
  const { error } = await supabase.from("transaction_subcategories").insert({ category_id: categoryId, name, active: true });
  throwIfError(error);
}

export async function linkOperatorToBoothRecord(supabase: CrudClient, operatorId: string, boothId: string) {
  const { error } = await supabase.from("operator_booths").upsert({ operator_id: operatorId, booth_id: boothId, active: true });
  throwIfError(error);
}

type ProfilePayload = {
  user_id: string;
  full_name: string;
  cpf: string | null;
  address: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  active: boolean;
};

export async function upsertProfileRecord(supabase: CrudClient, profile: ProfilePayload) {
  const { error } = await supabase.from("profiles").upsert(profile);
  throwIfError(error);
}

export async function sendPasswordReset(supabase: CrudClient, email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  throwIfError(error);
}

export async function toggleCompanyActiveRecord(supabase: CrudClient, companyId: string, active: boolean) {
  await toggleActive(supabase, "companies", "id", companyId, active);
}

export async function toggleBoothActiveRecord(supabase: CrudClient, boothId: string, active: boolean) {
  await toggleActive(supabase, "booths", "id", boothId, active);
}

export async function toggleProfileActiveRecord(supabase: CrudClient, userId: string, active: boolean) {
  await toggleActive(supabase, "profiles", "user_id", userId, active);
}

export async function toggleCategoryActiveRecord(supabase: CrudClient, categoryId: string, active: boolean) {
  await toggleActive(supabase, "transaction_categories", "id", categoryId, active);
}

export async function toggleSubcategoryActiveRecord(supabase: CrudClient, subcategoryId: string, active: boolean) {
  await toggleActive(supabase, "transaction_subcategories", "id", subcategoryId, active);
}

export async function setOperatorBoothLinkActiveRecord(supabase: CrudClient, linkId: string, active: boolean) {
  await toggleActive(supabase, "operator_booths", "id", linkId, active);
}

export async function approveAdjustmentRecord(supabase: CrudClient, adjustmentId: string, transactionId: string) {
  const txResult = await supabase.from("transactions").update({ status: "voided" }).eq("id", transactionId);
  throwIfError(txResult.error);

  const reviewer = await supabase.auth.getUser();
  throwIfError(reviewer.error);

  const adjustmentResult = await supabase
    .from("adjustment_requests")
    .update({ status: "approved", reviewed_by: reviewer.data.user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", adjustmentId);

  throwIfError(adjustmentResult.error);
}

export async function rejectAdjustmentRecord(supabase: CrudClient, adjustmentId: string) {
  const reviewer = await supabase.auth.getUser();
  throwIfError(reviewer.error);

  const { error } = await supabase
    .from("adjustment_requests")
    .update({ status: "rejected", reviewed_by: reviewer.data.user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", adjustmentId);

  throwIfError(error);
}

export async function forceCloseShiftRecord(supabase: CrudClient, shiftId: string) {
  const { error } = await supabase.rpc("close_shift", { p_shift_id: shiftId, p_ip: null, p_notes: "Encerrado pelo admin" });
  throwIfError(error);
}
