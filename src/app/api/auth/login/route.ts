import { NextRequest, NextResponse } from "next/server";
import { userDB } from "@/lib/users";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: "Email e senha obrigatórios." }, { status: 400 });

    const user = userDB.verify(email, password);
    if (!user)
      return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Erro ao fazer login." }, { status: 500 });
  }
}
