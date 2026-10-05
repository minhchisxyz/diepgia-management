import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UserProfile from "./user-profile";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  if (!session) redirect("/login");
  if (session.userId !== id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, role: true },
  });
  if (!user) notFound();

  return <UserProfile user={user} />;
}
