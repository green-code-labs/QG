import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { Message } from "@/types/tree";

const client = new Anthropic();

const SYSTEM_PROMPT = `Você é o QG — um planejador de vida pessoal com IA. Seu papel é ajudar o usuário a construir e refinar uma árvore de decisão dinâmica para a vida deles.

REGRAS CRÍTICAS:
1. Sempre retorne um JSON estruturado com "tree" e "message" — sem exceções.
2. O "message" é uma resposta curta e direta em português (máx 3 frases).
3. O "tree" é a árvore COMPLETA atualizada (não apenas delta).
4. Preserve IDs existentes quando atualizar nós — só crie novos IDs para novos nós.
5. Quando o usuário mencionar uma nova oportunidade, evento ou mudança, atualize pesos e probabilidades.
6. Para cada nó, inclua "probabilityReasoning" explicando a lógica por trás do número (ex: "70% porque o usuário tem 3 anos de experiência relevante, mas ainda precisa de certificação").

ESTRUTURA DO JSON DE SAÍDA (sempre exatamente isso):
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
        "actions": ["Ação 1", "Ação 2", "Ação 3"],
        "status": "active",
        "isRoot": true
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "source": "node-1",
        "target": "node-2",
        "data": { "label": "se...", "weight": 0.7 }
      }
    ],
    "createdAt": "ISO date",
    "updatedAt": "ISO date now"
  }
}

CAMPOS DOS NÓS:
- status: "active" (em andamento), "completed" (concluído), "blocked" (bloqueado), "opportunity" (nova oportunidade)
- probability: 0-100 (chance de sucesso nesse caminho)
- probabilityReasoning: explicação de 1-2 frases do cálculo ponderado
- isRoot: true apenas para o nó raiz (situação atual)
- actions: lista de 2-4 próximos passos concretos e acionáveis

FILOSOFIA:
- Pense como Random Forest: múltiplos caminhos paralelos, não um único caminho linear
- Inclua nós de "no-regret moves" (ações que valem em qualquer cenário)
- Quando um novo evento aparecer, atualize probabilidades e adicione novos galhos
- Mantenha a árvore enxuta mas informativa (máx ~15 nós)
- Se o usuário enviar imagens, analise-as e incorpore as informações na árvore

Responda SOMENTE com JSON válido. Nada antes ou depois do JSON.`;

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function buildAnthropicMessages(messages: Message[], currentTree: unknown): Anthropic.MessageParam[] {
  return messages.map((m, idx) => {
    const isLast = idx === messages.length - 1;
    const treeContext =
      isLast && currentTree
        ? `\n\nÁRVORE ATUAL (JSON):\n${JSON.stringify(currentTree, null, 2)}`
        : "";

    if (m.role === "user" && m.images && m.images.length > 0) {
      const content: Anthropic.ContentBlockParam[] = m.images.map((img) => {
        const [header, data] = img.split(",");
        const rawType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
        const mediaType: ImageMediaType =
          ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(rawType)
            ? (rawType as ImageMediaType)
            : "image/jpeg";
        return {
          type: "image" as const,
          source: { type: "base64" as const, media_type: mediaType, data },
        };
      });
      content.push({ type: "text", text: m.content + treeContext });
      return { role: "user" as const, content };
    }

    return {
      role: m.role as "user" | "assistant",
      content: isLast ? m.content + treeContext : m.content,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, currentTree } = await req.json();
    const anthropicMessages = buildAnthropicMessages(messages, currentTree);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
