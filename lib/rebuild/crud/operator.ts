import type { SupabaseClient } from "@supabase/supabase-js";

type CrudClient = SupabaseClient<any, "public", any>;

function throwIfError(error: { message?: string } | null | undefined) {
  if (error) throw new Error(error.message ?? "Operação não pôde ser concluída.");
}

type ShiftRecord = {
  id: string;
  booth_id: string;
  status: "open" | "closed";
};

export async function openShiftRecord(supabase: CrudClient, boothId: string) {
  const { data, error } = await supabase.rpc("open_shift", { p_booth_id: boothId, p_ip: null });
  throwIfError(error);
  return data as ShiftRecord;
}

export async function upsertShiftCashClosingRecord(
  supabase: CrudClient,
  payload: {
    shift_id: string;
    booth_id: string;
    user_id: string;
    expected_cash: number;
    declared_cash: number;
    difference: number;
    note: string | null;
  }
) {
  const { error } = await supabase.from("shift_cash_closings").upsert(payload);
  throwIfError(error);
}

export async function closeShiftRecord(supabase: CrudClient, shiftId: string, notes: string | null) {
  const { error } = await supabase.rpc("close_shift", { p_shift_id: shiftId, p_ip: null, p_notes: notes });
  throwIfError(error);
}

export async function createTimePunchRecord(
  supabase: CrudClient,
  payload: {
    user_id: string;
    booth_id: string | null;
    shift_id: string | null;
    punch_type: "entrada" | "saida" | "pausa_inicio" | "pausa_fim";
    note: string;
  }
) {
  const { error } = await supabase.from("time_punches").insert(payload);
  throwIfError(error);
}

export async function createCashMovementRecord(
  supabase: CrudClient,
  payload: {
    shift_id: string;
    booth_id: string;
    user_id: string;
    movement_type: "suprimento" | "sangria" | "ajuste";
    amount: number;
    note: string | null;
  }
) {
  const { error } = await supabase.from("cash_movements").insert(payload);
  throwIfError(error);
}

export async function createTransactionRecord(
  supabase: CrudClient,
  payload: {
    shift_id: string;
    booth_id: string;
    operator_id: string;
    company_id: string;
    category_id: string;
    subcategory_id: string;
    amount: number;
    payment_method: "pix" | "credit" | "debit" | "cash";
    commission_percent: null;
    ticket_reference: string | null;
    note: string | null;
  }
) {
  const { data, error } = await supabase.from("transactions").insert(payload).select("id").single();
  throwIfError(error);
  return data as { id: string };
}

export async function uploadPaymentReceiptFile(supabase: CrudClient, path: string, file: File) {
  const { error } = await supabase.storage
    .from("payment-receipts")
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });

  throwIfError(error);
}

export async function upsertTransactionReceiptRecord(
  supabase: CrudClient,
  payload: {
    transaction_id: string;
    storage_path: string;
    mime_type: string;
    uploaded_by: string;
  }
) {
  const { error } = await supabase.from("transaction_receipts").upsert(payload);
  throwIfError(error);
}
