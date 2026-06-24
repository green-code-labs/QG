import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(db.getConversations(userId));
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, folderId } = await req.json();
  const convo = db.createConversation(userId, title ?? "Nova conversa", folderId);
  return NextResponse.json(convo, { status: 201 });
}
