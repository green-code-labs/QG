import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(db.getFolders(userId));
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, emoji } = await req.json();
  const folder = db.createFolder(userId, name ?? "Nova pasta", emoji ?? "📁");
  return NextResponse.json(folder, { status: 201 });
}
