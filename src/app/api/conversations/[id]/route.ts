import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/getUser";
import { db } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const convo = db.getConversation(userId, params.id);
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(convo);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const updated = db.updateConversation(userId, params.id, data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  db.deleteConversation(userId, params.id);
  return new NextResponse(null, { status: 204 });
}
