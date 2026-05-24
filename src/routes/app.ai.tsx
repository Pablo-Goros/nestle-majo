import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card } from "@/components/ui-bits";
import { useProduct } from "@/lib/product-context";
import {
  generateAssistantResponse,
  loadChatHistory,
  appendChatMessage,
  getRecommendedActions,
  QUICK_SUGGESTIONS,
  type ChatMessage,
} from "@/lib/assistant";
import { CLEANING_CHANGED_EVENT } from "@/lib/cleaning";
import { DATA_CHANGED_EVENT } from "@/lib/data";
import { INSIGHTS_CHANGED_EVENT } from "@/lib/insights/store";
import { MBP_CHANGED_EVENT } from "@/lib/mbp";
import { FINANCIAL_SIM_CHANGED_EVENT } from "@/lib/financial";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";

export const Route = createFileRoute("/app/ai")({ component: AI });

const CHIP_QUESTIONS: Record<string, string> = {
  "Ver alertas críticas": "¿Qué alertas están críticas?",
  "Explicar forecast": "¿Por qué subió el forecast?",
  "Revisar margen": "¿Cómo está el margen?",
  "Próximas tareas MBP": "¿Qué tareas MBP están atrasadas?",
  "SKUs con mayor Bias": "¿Qué SKU tiene mayor bias?",
  "Riesgo de stockout": "¿Hay riesgo de stockout?",
};

function AI() {
  const { product } = useProduct();
  const [msgs, setMsgs] = useState<ChatMessage[]>(() => loadChatHistory());
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [dataTick, setDataTick] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => setDataTick((t) => t + 1);
    window.addEventListener(INSIGHTS_CHANGED_EVENT, refresh);
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    window.addEventListener(CLEANING_CHANGED_EVENT, refresh);
    window.addEventListener(MBP_CHANGED_EVENT, refresh);
    window.addEventListener(FINANCIAL_SIM_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(INSIGHTS_CHANGED_EVENT, refresh);
      window.removeEventListener(DATA_CHANGED_EVENT, refresh);
      window.removeEventListener(CLEANING_CHANGED_EVENT, refresh);
      window.removeEventListener(MBP_CHANGED_EVENT, refresh);
      window.removeEventListener(FINANCIAL_SIM_CHANGED_EVENT, refresh);
    };
  }, []);

  const proactive = useMemo(() => {
    void dataTick;
    const actions = getRecommendedActions(product.code);
    return actions[0]?.text ?? "Sin recomendaciones urgentes por ahora.";
  }, [product.code, dataTick]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);

  const send = useCallback(
    (text: string) => {
      if (!text.trim() || thinking) return;
      const userText = text.trim();
      setMsgs((m) => appendChatMessage("user", userText, m));
      setInput("");
      setThinking(true);

      window.setTimeout(() => {
        const reply = generateAssistantResponse(userText, product.code);
        setMsgs((m) => appendChatMessage("assistant", reply, m));
        setThinking(false);
      }, 350);
    },
    [thinking, product.code],
  );

  return (
    <div>
      <PageHeader
        title="AI Assistant"
        subtitle={`Análisis y recomendaciones · SKU activo: ${product.name}`}
      />

      <div className="grid lg:grid-cols-4 gap-4">
        <Card title="Sugerencias" className="lg:col-span-1">
          <div className="flex flex-wrap gap-2 lg:flex-col lg:space-y-0">
            {QUICK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(CHIP_QUESTIONS[s] ?? s)}
                className="text-left text-sm px-3 py-2 rounded-full border hover:bg-accent lg:rounded-md lg:w-full"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-md bg-nestle-red/5 border border-nestle-red/20 text-xs">
            <strong>Recomendación proactiva:</strong> {proactive}
          </div>
        </Card>

        <Card className="lg:col-span-3 p-0">
          <div className="flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`size-8 rounded-md grid place-items-center shrink-0 ${m.role === "user" ? "bg-nestle-blue text-white" : "bg-nestle-red text-white"}`}
                  >
                    {m.role === "user" ? (
                      <User className="size-4" />
                    ) : (
                      <Bot className="size-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-line ${m.role === "user" ? "bg-nestle-blue text-white" : "bg-muted"}`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <div className="size-8 rounded-md bg-nestle-red text-white grid place-items-center">
                    <Bot className="size-4" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">Analizando datos…</div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t p-3 flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Preguntá al asistente…"
                className="flex-1 h-10 px-3 rounded-md border"
                disabled={thinking}
              />
              <button
                type="submit"
                disabled={thinking}
                className="h-10 px-4 rounded-md bg-nestle-red text-white flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="size-4" />
                Enviar
              </button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
