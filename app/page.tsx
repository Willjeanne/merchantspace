import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth/session";

export default async function RootPage() {
  const token = await getAuthToken();
  redirect(token ? "/dashboard" : "/login");
}
