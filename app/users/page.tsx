import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import UsersManager from "./users-manager";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  return <UsersManager />;
}
