import { NextRequest, NextResponse } from "next/server";
import { userDB } from "@/lib/users";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "Email obrigatório." }, { status: 400 });
    if (!password || password.length < 6)
      return NextResponse.json({ error: "Senha deve ter ao menos 6 caracteres." }, { status: 400 });

    const user = userDB.create(name, email, password);
    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao cadastrar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
