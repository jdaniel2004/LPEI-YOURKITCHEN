import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "menu-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File))
    return Response.json({ error: "Ficheiro em falta" }, { status: 400 });
  if (!ALLOWED.includes(file.type))
    return Response.json({ error: "Formato inválido (usa JPG, PNG, WebP ou GIF)" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return Response.json({ error: "Imagem demasiado grande (máx. 5 MB)" }, { status: 400 });

  const ext = EXT[file.type] ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return Response.json({ url: data.publicUrl }, { status: 201 });
}
