import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listUsers } from "@/lib/actions/users/data";
import UsersManager from "@/components/users/manager";
import { User } from "@/components/users/form";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const initialDataPromise = listUsers("") as Promise<{ items: User[]; total: number }>;

  return <UsersManager initialDataPromise={initialDataPromise} />;
}
