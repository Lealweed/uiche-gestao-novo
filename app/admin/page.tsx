import { redirect } from "next/navigation";

export default function AdminLegacyRedirect() {
  redirect("/v2/admin");
}
