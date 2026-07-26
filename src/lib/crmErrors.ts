import { toast } from "sonner";

export type CrmEntity =
  | "etapa"
  | "negócio"
  | "pessoa"
  | "lead"
  | "unidade do negócio"
  | "atividade"
  | "proposta"
  | "corretor"
  | "configuração"
  | "motivo de perda"
  | "tarefa"
  | "análise de crédito"
  | "comissão"
  | "rateio"
  | "meta"
  | "roleta";
export type CrmAction =
  | "criar"
  | "renomear"
  | "reordenar"
  | "excluir"
  | "atualizar"
  | "salvar"
  | "mover"
  | "consultar"
  | "distribuir";


export type SbErr =
  | { message?: string; code?: string; details?: string; hint?: string }
  | null
  | undefined;

const ARTICLE: Record<CrmEntity, string> = {
  "etapa": "a etapa",
  "negócio": "o negócio",
  "pessoa": "a pessoa",
  "lead": "o lead",
  "unidade do negócio": "a unidade do negócio",
  "atividade": "a atividade",
  "proposta": "a proposta",
  "corretor": "o corretor",
  "configuração": "a configuração",
  "motivo de perda": "o motivo de perda",
  "tarefa": "a tarefa",
  "análise de crédito": "a análise de crédito",
  "comissão": "a comissão",
  "rateio": "o rateio",
  "roleta": "a roleta",
};

const ARTICLE_ARE: Record<CrmEntity, string> = {
  "etapa": "esta etapa",
  "negócio": "este negócio",
  "pessoa": "esta pessoa",
  "lead": "este lead",
  "unidade do negócio": "esta unidade do negócio",
  "atividade": "esta atividade",
  "proposta": "esta proposta",
  "corretor": "este corretor",
  "configuração": "esta configuração",
  "motivo de perda": "este motivo de perda",
  "tarefa": "esta tarefa",
  "análise de crédito": "esta análise de crédito",
  "comissão": "esta comissão",
  "rateio": "este rateio",
  "roleta": "esta roleta",
};


export interface CrmErrorContext {
  entity: CrmEntity;
  action: CrmAction;
  /** Number of dependent rows blocking the action (e.g. deals in a stage). */
  dependents?: number;
  /** Extra hint prepended to the description when useful. */
  hint?: string;
}

export interface FriendlyError {
  title: string;
  description: string;
}

export function friendlyCrmError(err: SbErr, ctx: CrmErrorContext): FriendlyError {
  const raw = (err?.message || "").toLowerCase();
  const code = err?.code || "";
  const { entity, action } = ctx;

  // Custom trigger guarding system stages
  if (raw.includes("etapas de sistema") || raw.includes("system stage")) {
    return {
      title: "Etapa protegida",
      description:
        "As etapas de sistema (Ganho e Perdido) são exigidas pelo funil e não podem ser excluídas ou reordenadas.",
    };
  }

  // Foreign key violation — dependents still exist
  if (code === "23503" || raw.includes("foreign key") || raw.includes("violates foreign key")) {
    if (entity === "etapa") {
      const n = ctx.dependents ?? 0;
      return {
        title: "Etapa em uso",
        description:
          n > 0
            ? `Existem ${n} negócio${n === 1 ? "" : "s"} nesta etapa. Mova-os para outra etapa antes de excluir.`
            : "Esta etapa ainda está referenciada por negócios. Mova-os para outra etapa antes de excluir.",
      };
    }
    return {
      title: `${cap(entity)} em uso`,
      description: `${cap(ARTICLE_ARE[entity])} está referenciad${entity.endsWith("o") ? "o" : "a"} por outros registros. Remova as referências antes de ${action}.`,
    };
  }

  // RLS / permission denied
  if (
    code === "42501" ||
    code === "PGRST301" ||
    code === "PGRST116" ||
    raw.includes("row-level security") ||
    raw.includes("row level security") ||
    raw.includes("permission denied") ||
    raw.includes("not authorized") ||
    raw.includes("new row violates")
  ) {
    const onlyAdmin = entity === "etapa";
    return {
      title: "Sem permissão",
      description: onlyAdmin
        ? `Seu perfil não pode ${action} etapas do funil. Apenas administradores Bewild têm essa permissão.`
        : `Seu perfil não pode ${action} ${ARTICLE[entity]}. Verifique com um administrador se este acesso deveria estar liberado.`,
    };
  }

  // Unique constraint (position conflicts, duplicate people, etc.)
  if (code === "23505" || raw.includes("duplicate key") || raw.includes("unique")) {
    if (entity === "etapa" && action === "reordenar") {
      return {
        title: "Conflito de ordem",
        description: "Duas etapas acabaram com a mesma posição. Recarregue e tente novamente.",
      };
    }
    return {
      title: "Registro duplicado",
      description: `Já existe ${ARTICLE[entity]} com esses dados.`,
    };
  }

  // Not-null violation
  if (code === "23502" || raw.includes("not-null") || raw.includes("null value")) {
    return {
      title: "Campo obrigatório",
      description: `Preencha os campos obrigatórios antes de ${action} ${ARTICLE[entity]}.`,
    };
  }

  // Check constraint
  if (code === "23514" || raw.includes("check constraint")) {
    return {
      title: "Valor inválido",
      description: `Algum campo não atende às regras exigidas para ${action} ${ARTICLE[entity]}.`,
    };
  }

  const fallback = defaultTitle(action, entity);
  return {
    title: fallback,
    description: ctx.hint || err?.message || "Tente novamente em instantes.",
  };
}

export function notifyCrmError(err: SbErr, ctx: CrmErrorContext): void {
  const { title, description } = friendlyCrmError(err, ctx);
  toast.error(title, { description });
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function defaultTitle(action: CrmAction, entity: CrmEntity): string {
  const verb: Record<CrmAction, string> = {
    criar: "criar",
    renomear: "renomear",
    reordenar: "reordenar",
    excluir: "excluir",
    atualizar: "atualizar",
    mover: "mover",
    consultar: "consultar",
    distribuir: "distribuir",
  };
  return `Não foi possível ${verb[action]} ${ARTICLE[entity]}.`;
}
