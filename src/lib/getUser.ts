import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session as any)?.user?.id ?? null;
}
