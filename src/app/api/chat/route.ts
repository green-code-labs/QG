import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { Message, FileAttachment } from "@/types/tree";

const client = new Anthropic();

const SYSTEM_PROMPT = `Você é o QG — um planejador de vida pessoal com IA. Seu papel é ajudar o usuário a construir e refinar uma árvore de decisão dinâmica para a vida deles.

REGRAS CRÍTICAS:
1. Sempre retorne um JSON estruturado com "tree" e "message" — sem exceções.
2. O "message" é uma resposta curta e direta em português (máx 3 frases).
3. O "tree" é a árvore COMPLETA atualizada (não apenas delta).
4. Preserve IDs existentes ao atualizar nós — crie novos IDs só para novos nós.
5. Quando o usuário mencionar nova oportunidade, evento ou mudança, atualize pesos e probabilidades.
6. Para cada nó, inclua "probabilityReasoning" explicando a lógica do número.
7. Se receber arquivos ou imagens, analise o conteúdo e incorpore na árvore.

ESTRUTURA DO JSON DE SAÍDA:
{
  "message": "Resposta curta ao usuário.",
  "tree": {
    "id": "tree-1",
    "title": "Título da Árvore",
    "nodes": [
      {
        "id": "node-1",
        "label": "Nome curto",
        "description": "Descrição do nó",
        "probability": 75,
        "probabilityReasoning": "75% pois X tem Y habilidades mas ainda precisa de Z...",
        "timeframe": "6-12 meses",
        "actions": ["Ação 1", "Ação 2"],
        "status": "active",
        "isRoot": true
      }
    ],
    "edges": [
      { "id": "edge-1", "source": "node-1", "target": "node-2", "data": { "label": "se...", "weight": 0.7 } }
    ],
    "createdAt": "ISO date",
    "updatedAt": "ISO date now"
  }
}

status: "active" | "completed" | "blocked" | "opportunity"
Mantenha máx ~15 nós. Pense como Random Forest: múltiplos caminhos paralelos.
Responda SOMENTE com JSON válido.`;

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const IMAGE_TYPES = new Set<string>(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function fileToBlock(file: FileAttachment): Anthropic.ContentBlockParam {
  if (file.mimeType === "application/pdf") {
    return {
      type: "document" as const,
      source: { type: "base64" as const, media_type: "application/pdf" as const, data: file.data },
    };
  }
  // All text-based files (txt, md, csv, json, code files, etc.)
  return {
    type: "text" as const,
    text: `[Arquivo: ${file.name}]\n\`\`\`\n${file.data}\n\`\`\``,
  };
}

function buildMessages(messages: Message[], currentTree: unknown): Anthropic.MessageParam[] {
  return messages.map((m, idx) => {
    const isLast = idx === messages.length - 1;
    const treeCtx =
      isLast && currentTree
        ? `\n\nÁRVORE ATUAL:\n${JSON.stringify(currentTree, null, 2)}`
        : "";

    const hasImages = m.role === "user" && (m.images?.length ?? 0) > 0;
    const hasFiles = m.role === "user" && (m.files?.length ?? 0) > 0;

    if (hasImages || hasFiles) {
      const content: Anthropic.ContentBlockParam[] = [];

      for (const img of m.images ?? []) {
        const [header, data] = img.split(",");
        const raw = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
        const mediaType = (IMAGE_TYPES.has(raw) ? raw : "image/jpeg") as ImageMediaType;
        content.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
      }

      for (const file of m.files ?? []) {
        content.push(fileToBlock(file));
      }

      content.push({ type: "text", text: (m.content || "Analise os arquivos acima.") + treeCtx });
      return { role: "user" as const, content };
    }

    return {
      role: m.role as "user" | "assistant",
      content: isLast ? m.content + treeCtx : m.content,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, currentTree } = await req.json();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: buildMessages(messages, currentTree),
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
