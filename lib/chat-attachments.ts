export const CHAT_ATTACHMENT_BUCKET = "chat-attachments";
export const MAX_CHAT_ATTACHMENT_SIZE = 10 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "anexo";
}

export function validateChatAttachment(file: File) {
  if (!file) return "Selecione um arquivo válido.";
  if (file.size > MAX_CHAT_ATTACHMENT_SIZE) {
    return "O anexo deve ter no máximo 10MB.";
  }
  return null;
}

export function isImageChatAttachment(attachmentType?: string | null, attachmentName?: string | null) {
  if ((attachmentType ?? "").startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachmentName ?? "");
}

function isSafeAttachmentPath(path: string) {
  return /^[0-9a-fA-F-]+\/[0-9]+-[a-zA-Z0-9._-]+$/.test(path);
}

export async function getChatAttachmentUrl(supabase: any, attachmentPath?: string | null) {
  if (!attachmentPath || !isSafeAttachmentPath(attachmentPath)) return null;

  const signed = await supabase.storage.from(CHAT_ATTACHMENT_BUCKET).createSignedUrl(attachmentPath, 60 * 60 * 8);
  if (signed.error) return null;
  return signed.data?.signedUrl ?? null;
}

export async function uploadChatAttachment(supabase: any, ownerId: string, file: File) {
  const safeName = sanitizeFileName(file.name);
  const contentType = file.type || "application/octet-stream";
  const path = `${ownerId}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage.from(CHAT_ATTACHMENT_BUCKET).upload(path, file, {
    upsert: true,
    contentType,
  });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  const attachmentUrl = await getChatAttachmentUrl(supabase, path);

  return {
    attachment_path: path,
    attachment_name: file.name,
    attachment_type: contentType,
    attachment_size: file.size,
    attachment_url: attachmentUrl,
  };
}
