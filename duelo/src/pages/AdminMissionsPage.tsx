import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

export default function AdminMissionsPage() {
  const user = useAuthStore((s: any) => s.user);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("daily");

  function getDifficultyColor(difficulty: string) {
    if (difficulty === "easy")
      return "bg-green-900/40 border-green-500/40 text-green-300";
    if (difficulty === "medium")
      return "bg-yellow-900/40 border-yellow-500/40 text-yellow-300";
    if (difficulty === "hard")
      return "bg-orange-900/40 border-orange-500/40 text-orange-300";
    if (difficulty === "hard_prolonged")
      return "bg-red-900/40 border-red-500/40 text-red-300";
    return "bg-blue-900/30 border-blue-500/20 text-blue-400";
  }

  useEffect(() => {
    if (user?.role === "admin") {
      fetchTemplates(activeTab);
    }
  }, [user, activeTab]);

  const fetchTemplates = async (category: string) => {
    try {
      const q = query(
        collection(db, "missions", category, "templates"),
        orderBy("updatedAt", "desc"),
        limit(20),
      );
      const snap = await getDocs(q);
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  // Simple role guard using user state instead of profile
  if (user?.role !== "admin") {
    // Show a loading or check state if auth is still loading
    if (!user)
      return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
          <div className="text-white font-bungee animate-pulse text-2xl">
            INITIALIZING ADMIN ACCESS...
          </div>
        </div>
      );
    return <Navigate to="/" replace />;
  }

  const generateWithGemini = async (periodType: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const model = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.1-flash-lite";
    if (!apiKey) {
      throw new Error("Missing VITE_GEMINI_API_KEY in .env");
    }
    if (!model) {
      throw new Error(
        "Missing VITE_GEMINI_MODEL in .env (example: gemini-3.1-flash-lite)",
      );
    }

    let count = 0;
    let diff = "";
    let rew = "";

    if (periodType === "daily") {
      count = 6;
      diff = "must be 'easy' or 'medium'";
      rew = "multiple of 50 coins (50-300)";
    } else if (periodType === "weekly") {
      count = 10;
      diff = "must be 'medium' or 'hard'";
      rew = "multiple of 50 coins (150-500) and if hard, 1-5 rubies";
    } else {
      count = 8;
      diff = "must be 'hard' or 'hard_prolonged'";
      rew = "multiple of 50 coins (300-1000) and 1-5 rubies";
    }

    const prompt = `\
Você é um designer de missões para o jogo competitivo de cartas "Big Bang Duel" (duelo de cartas faroeste espacial).
Gere EXATAMENTE ${count} missões NOVAS e VARIADAS de categoria ${periodType.toUpperCase()}.

=== MÉTRICAS DISPONÍVEIS (use metric name exatamente) ===
- shotsAccuracy: Contador de tiros bem-sucedidos na partida
- doubleShotsAccuracy: Tiros duplos bem-sucedidos
- dodgesSuccessful: Esquivas bem-sucedidas durante combate
- countersSuccessful: Contra-ataques bem-sucedidos
- reloadCount: Número de recargas usadas
- result:win: Vitórias (alvo sempre 1)
- damageDealt: Dano total causado ao inimigo
- result:loss: Derrotas (alvo sempre 1)

=== ESTRUCTURA DE DESCRIÇÃO ===
A field "description" deve ser um OBJETO JSON com 3 campos separados (NÃO texto único):
{
  "achievement": "qual é o objetivo final da missão", 
  "how": "como conseguir/qual carta usar/qual estratégia aplicar",
  "rewards": "o que o jogador recebe"
}

Exemplo:
{
  "achievement": "Usar 12 recargas durante as partidas",
  "how": "Recarregue sua arma sempre que tiver uma pausa ou precisar de mais balas",
  "rewards": "+100 ouro"
}

=== RESTRIÇÕES CRÍTICAS ===
1. Dificuldade: ${diff}
2. Recompensa: ${rew}
3. Varie TODAS as métricas - NÃO REPITA a mesma métrica
4. Targets devem ser realistas para ${periodType}:
   - daily: targets 5-15 (missões curtas)
   - weekly: targets 20-50 (missões de múltiplas partidas)
   - monthly: targets 50-150 (missões de longo prazo)
5. type field DEVE ser um texto descritivo curto (ex: "Ofensiva", "Defesa", "Técnica")
6. JAMAIS misture achievement/how/rewards no texto - mantenha campos separados

=== EXEMPLOS DE MISSÕES BEM FORMATADAS ===
{
  "name": "Escapista do Deserto",
  "description": {
    "achievement": "Desviar 10 ataques",
    "how": "Foque em timing - clique em dodge quando o inimigo atacar",
    "rewards": "+100 ouro"
  },
  "difficulty": "medium",
  "objective": {
    "type": "Defesa",
    "target": 10,
    "metric": "dodgesSuccessful"
  },
  "reward": {"gold": 100, "ruby": 0}
}

{
  "name": "Precisão de Elite",
  "description": {
    "achievement": "Acertar 15 tiros bem-sucedidos",
    "how": "Use cartas Shot contra inimigos lentos - tiros rápidos e precisos",
    "rewards": "+150 ouro + 1 rubi"
  },
  "difficulty": "medium",
  "objective": {
    "type": "Ofensiva",
    "target": 15,
    "metric": "shotsAccuracy"
  },
  "reward": {"gold": 150, "ruby": 1}
}

{
  "name": "Vencedor da Noite",
  "description": {
    "achievement": "Vencer 3 partidas consecutivas",
    "how": "Ganhe batalhas usando sua melhor estratégia e cartas de poder",
    "rewards": "+200 ouro + 2 rubis"
  },
  "difficulty": "hard",
  "objective": {
    "type": "Vitória",
    "target": 3,
    "metric": "result:win"
  },
  "reward": {"gold": 200, "ruby": 2}
}

AGORA GERE ${count} MISSÕES DIFERENTES, CRIATIVAS E EXPLÍCITAS EM PORTUGUÊS.

Retorne APENAS JSON válido (sem markdown, sem explicações):
[
  {
    "name": "string",
    "description": {
      "achievement": "string",
      "how": "string",
      "rewards": "string"
    },
    "difficulty": "${diff.includes("easy") ? "easy" : diff.includes("medium") ? "medium" : "hard"}",
    "objective": {
      "type": "string descritivo único",
      "target": número realista,
      "metric": "nome_exato_da_métrica"
    },
    "reward": {
      "gold": número válido,
      "ruby": ${diff === "hard" || diff === "hard_prolonged" ? "1-5" : "0"}
    }
  }
]
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const data = await res.json();
    let textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error("Empty response from Gemini");

    // Remove any markdown formatting if present
    textOutput = textOutput
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed = JSON.parse(textOutput);
    return parsed.map((m: any) => ({
      ...m,
      category: periodType,
      updatedAt: Date.now(),
    }));
  };

  const handleGenerateTemplates = async (periodType: string) => {
    setLoading(true);
    setMessage(`Generating ${periodType} templates via GenAI directly...`);
    try {
      const missions = await generateWithGemini(periodType);

      const batch = writeBatch(db);
      for (const mission of missions) {
        // Save to missions/{daily|weekly|monthly}/templates/{id}
        const newRef = doc(collection(db, "missions", periodType, "templates"));
        batch.set(newRef, {
          id: newRef.id,
          ...mission,
          category: periodType, // redundant but safe
          updatedAt: Date.now(),
        });
      }

      // Explicitly matching the rule /missions/generationLog/logs/{logId}
      const logRef = doc(collection(db, "missions", "generationLog", "logs"));
      batch.set(logRef, {
        periodType,
        count: missions.length,
        timestamp: Date.now(),
        status: "success",
        generatedBy: user?.uid || "admin_manual",
      });

      console.log(
        `[AdminMissions] Committing batch for ${missions.length} templates + 1 log...`,
      );
      await batch.commit();

      setMessage(
        `Success: Saved ${missions.length} ${periodType} missions to Firestore.`,
      );
      fetchTemplates(periodType);
    } catch (error: any) {
      console.error("[AdminMissions] Permission or Save Error:", error);
      setMessage(
        `Error: ${error.message} (Check Firestore Rules for /missions/${periodType}/templates)`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualAssignment = async (periodType: string) => {
    if (!user?.uid) return;
    setLoading(true);
    setMessage(`Assigning ${periodType} missions to you...`);
    try {
      const templatesSnap = await getDocs(
        collection(db, "missions", periodType, "templates"),
      );
      if (templatesSnap.empty) {
        throw new Error(
          `No templates found for ${periodType}. Generate first.`,
        );
      }

      const templates = templatesSnap.docs.map((d) => d.data());
      // shuffle randomly
      const shuffled = templates.sort(() => 0.5 - Math.random());

      const maxActive =
        periodType === "daily" ? 3 : periodType === "weekly" ? 5 : 4;
      const selected = shuffled.slice(0, maxActive);

      const batch = writeBatch(db);
      const playerMissionsRef = collection(db, "players", user.uid, "missions");

      selected.forEach((m) => {
        const ref = doc(playerMissionsRef);
        batch.set(ref, {
          ...m,
          uid: user.uid,
          category: periodType,
          progress: 0,
          completed: false,
          claimed: false,
          assignedAt: Date.now(),
          expiresAt:
            Date.now() +
            (periodType === "daily"
              ? 48 * 60 * 60 * 1000
              : periodType === "weekly"
                ? 7 * 24 * 60 * 60 * 1000
                : 30 * 24 * 60 * 60 * 1000),
        });
      });

      await batch.commit();
      setMessage(
        `Success: Assigned ${selected.length} random from ${periodType} templates.`,
      );
    } catch (error: any) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <nav className="fixed top-0 left-0 right-0 h-16 bg-neutral-950/80 backdrop-blur-md border-b border-white/10 flex items-center px-8 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 flex items-center justify-center rounded font-bungee text-2xl skew-x-[-10deg] shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            A
          </div>
          <h1 className="text-xl font-bungee tracking-wider text-blue-400">
            BB_DUEL :: ADMIN_CONSOLE
          </h1>
        </div>
        <div className="ml-auto text-xs font-mono text-neutral-500 bg-neutral-900 px-3 py-1 rounded border border-white/5 uppercase">
          Authorization: {user?.role || "UNKNOWN"} // UID:{" "}
          {user?.uid?.slice(0, 8)}...
        </div>
      </nav>

      <div className="relative pt-24 px-8 pb-12 max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-bungee mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              MISSION_GENERATOR_V1.2
            </h2>
            <p className="text-neutral-400 font-mono text-sm border-l-2 border-blue-500/50 pl-3">
              AI-driven mission synthesis using Gemini 3.1 Flash Lite.
              <br /> Targets: Daily (6), Weekly (10), Monthly (8) slots.
            </p>
          </div>

          <div className="flex gap-2 p-1 bg-neutral-800/50 rounded-lg border border-white/5 backdrop-blur">
            {["daily", "weekly", "monthly"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-md font-bungee text-sm transition-all duration-200 uppercase ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Controls Sidepanel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-neutral-800/40 border border-white/10 rounded-xl p-6 backdrop-blur">
              <h3 className="font-bungee text-sm text-blue-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                SYSTEM_ACTIONS
              </h3>

              <div className="space-y-3">
                <button
                  onClick={() => handleGenerateTemplates(activeTab)}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-white py-3 px-4 font-bungee rounded-lg shadow-lg shadow-blue-600/20 transition-all uppercase text-sm border-b-4 border-blue-800"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      PROMPTING...
                    </span>
                  ) : (
                    `Generate ${activeTab} Templates`
                  )}
                </button>

                <button
                  onClick={() => handleManualAssignment(activeTab)}
                  disabled={loading}
                  className="w-full bg-neutral-700 hover:bg-neutral-600 text-white py-3 px-4 font-bungee rounded-lg transition-all uppercase text-sm border-b-4 border-neutral-900"
                >
                  Assign to My Account
                </button>
              </div>

              {message && (
                <div className="mt-6 p-4 bg-black/40 border border-blue-500/30 rounded-lg">
                  <p className="text-[10px] font-mono text-blue-300 break-words leading-tight">
                    <span className="text-blue-500 mr-2">LOG</span>
                    {message}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4">
              <h4 className="font-bungee text-xs text-amber-500 mb-2">
                DANGER_ZONE
              </h4>
              <p className="text-[11px] text-neutral-400 font-mono mb-4">
                Redundant actions may consume Gemini API quotas or clutter
                Firestore logs.
              </p>
              <button
                className="w-full py-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-500/30 rounded font-bungee text-[10px] uppercase"
                onClick={() => {
                  if (confirm("Flush all current templates?")) {
                    alert("Logic not implemented - Use Firebase Console");
                  }
                }}
              >
                Clear Selected Templates
              </button>
            </div>
          </div>

          {/* Missions List */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bungee text-sm text-neutral-400 uppercase tracking-widest">
                Template Explorer ({templates.length})
              </h3>
              <button
                onClick={() => fetchTemplates(activeTab)}
                className="text-[10px] font-mono text-blue-400 hover:underline"
              >
                REFRESH_DATABASE
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-neutral-600 group hover:border-blue-500/20 transition-all">
                <svg
                  className="w-12 h-12 mb-3 opacity-20 group-hover:opacity-40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <p className="font-bungee tracking-tighter">
                  NO_DATA_AVAILABLE_FOR_{activeTab}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((tpl, i) => (
                  <div
                    key={tpl.id || i}
                    className="group bg-neutral-800/30 border border-white/5 hover:border-blue-500/50 rounded-xl p-5 transition-all duration-300 flex flex-col relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-all" />

                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase ${getDifficultyColor(tpl.difficulty)}`}
                        >
                          {tpl.difficulty}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        {tpl.reward?.gold && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-amber-400">
                              {tpl.reward.gold}
                            </span>
                            <span className="text-[10px] text-amber-500/50 font-bungee">
                              G
                            </span>
                          </div>
                        )}
                        {tpl.reward?.ruby && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-red-500">
                              {tpl.reward.ruby}
                            </span>
                            <span className="text-[10px] text-red-500/50 font-bungee">
                              R
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <h4 className="text-lg font-bungee text-white mb-2 leading-tight group-hover:text-blue-300 transition-colors">
                      {tpl.name}
                    </h4>
                    <div className="text-xs text-neutral-400 font-medium mb-4 flex-grow italic line-clamp-3">
                      {typeof tpl.description === "object" &&
                      tpl.description !== null ? (
                        <div className="space-y-1">
                          <div className="text-[11px]">
                            <span className="font-mono text-neutral-500 uppercase text-[9px] mr-2">
                              Objetivo:
                            </span>
                            <span className="text-neutral-300">
                              {tpl.description.achievement}
                            </span>
                          </div>
                          <div className="text-[11px]">
                            <span className="font-mono text-neutral-500 uppercase text-[9px] mr-2">
                              Como:
                            </span>
                            <span className="text-neutral-300">
                              {tpl.description.how}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="mb-0">"{tpl.description}"</p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                      <div className="text-neutral-500">
                        TYPE:{" "}
                        <span className="text-neutral-300">
                          {tpl.objective?.type}
                        </span>
                      </div>
                      <div className="text-blue-400 font-bold group-hover:scale-110 transition-transform">
                        GOAL: {tpl.objective?.target}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
