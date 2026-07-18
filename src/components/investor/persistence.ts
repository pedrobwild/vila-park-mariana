// Persistência local para o Guia do Investidor.
// Salva respostas do quiz e inputs do simulador para sobreviverem a reloads.

const KEYS = {
  quiz: "vp_investor_quiz_v1",
  simulator: "vp_investor_simulator_v1",
} as const;

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage cheio ou desabilitado — ignora silenciosamente
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export interface QuizPersisted {
  step: number;
  answers: Record<string, string>;
  resultTypoId?: string;
}

export const quizStorage = {
  load: () => safeGet<QuizPersisted>(KEYS.quiz),
  save: (v: QuizPersisted) => safeSet(KEYS.quiz, v),
  clear: () => safeRemove(KEYS.quiz),
};

export interface SimulatorPersisted {
  typoId: string;
  mode: "tradicional" | "temporada";
  capexLevelId: string;
  price: string;
  rent: string;
  daily: string;
  occupancy: number;
  condoIptu: string;
}

export const simulatorStorage = {
  load: () => safeGet<SimulatorPersisted>(KEYS.simulator),
  save: (v: SimulatorPersisted) => safeSet(KEYS.simulator, v),
  clear: () => safeRemove(KEYS.simulator),
};
