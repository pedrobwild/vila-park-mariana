/**
 * Guide Decision Context
 * Shares investor profile, unit score, and selected bairro across guide sections.
 * Lightweight context that transforms the guide from static content to a decision system.
 */
import { createContext, useContext, useState, type ReactNode } from "react";
import type { InvestorProfile, QuizAnswers } from "@/lib/investorQuiz";

export interface UnitScore {
  total: number;
  max: number;
  pct: number;
  tier: string;
  categoryScores: { key: string; label: string; checked: number; total: number }[];
}

export interface GuideDecisionState {
  // Investor Profile
  quizAnswers: QuizAnswers | null;
  investorProfile: InvestorProfile | null;
  setInvestorDiagnostic: (answers: QuizAnswers, profile: InvestorProfile) => void;
  // Unit Evaluation
  unitScore: UnitScore | null;
  setUnitScore: (score: UnitScore) => void;
  // Selected bairro for recommendation
  selectedBairro: string | null;
  setSelectedBairro: (bairro: string) => void;
  // Computed readiness
  hasProfile: boolean;
  hasUnitScore: boolean;
  isReady: boolean;
}

const GuideDecisionContext = createContext<GuideDecisionState | null>(null);

export function GuideDecisionProvider({ children }: { children: ReactNode }) {
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers | null>(null);
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile | null>(null);
  const [unitScore, setUnitScore] = useState<UnitScore | null>(null);
  const [selectedBairro, setSelectedBairro] = useState<string | null>(null);

  const setInvestorDiagnostic = (answers: QuizAnswers, profile: InvestorProfile) => {
    setQuizAnswers(answers);
    setInvestorProfile(profile);
  };

  const hasProfile = !!investorProfile;
  const hasUnitScore = !!unitScore && unitScore.total > 0;
  const isReady = hasProfile;

  return (
    <GuideDecisionContext.Provider
      value={{
        quizAnswers, investorProfile, setInvestorDiagnostic,
        unitScore, setUnitScore,
        selectedBairro, setSelectedBairro,
        hasProfile, hasUnitScore, isReady,
      }}
    >
      {children}
    </GuideDecisionContext.Provider>
  );
}

export function useGuideDecision() {
  const ctx = useContext(GuideDecisionContext);
  if (!ctx) throw new Error("useGuideDecision must be used inside GuideDecisionProvider");
  return ctx;
}
