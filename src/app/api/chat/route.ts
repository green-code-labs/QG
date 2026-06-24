import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const SYSTEM_PROMPT = `Você é o QG — um planejador de vida pessoal com IA. Seu papel é ajudar o usuário a construir e refinar uma árvore de decisão dinâmica para a vida deles.

REGRAS CRÍTICAS:
1. Sempre retorne um JSON estruturado com "tree" e "message" — sem exceções.
2. O "message" é uma resposta curta e direta em português (máx 3 frases).
3. O "tree" é a árvore COMPLETA atualizada (não apenas delta).
4. Preserve IDs existentes quando atualizar nós — só crie novos IDs para novos nós.
5. Quando o usuário mencionar uma nova oportunidade, evento ou mudança, atualize pesos e probabilidades.

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
        "timeframe": "6-12 meses",
        "actions": ["Ação 1", "Ação 2"],
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
- isRoot: true apenas para o nó raiz (situação atual)
- actions: lista de próximos passos concretos

FILOSOFIA:
- Pense como Random Forest: múltiplos caminhos paralelos, não um único caminho linear
- Inclua nós de "no-regret moves" (ações que valem em qualquer cenário)
- Quando um novo evento aparecer, atualize probabilidades e adicione novos galhos
- Mantenha a árvore enxuta mas informativa (máx ~15 nós para não sobrecarregar)

Responda SOMENTE com JSON válido. Nada antes ou depois do JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, currentTree } = await req.json();

    const contextMessage = currentTree
      ? `\n\nÁRVORE ATUAL (JSON):\n${JSON.stringify(currentTree, null, 2)}`
      : "";

    const anthropicMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content:
          m.role === "user" && messages.indexOf(m) === messages.length - 1
            ? m.content + contextMessage
            : m.content,
      })
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON — handle cases where model wraps in ```json
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Invalid response from AI" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
