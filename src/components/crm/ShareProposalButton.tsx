import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Share2, Copy, ExternalLink, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import { WHATSAPP_PHONE } from "@/data/surroundings";
import type { DealFull } from "./CrmSection";

interface Props {
  deal: DealFull;
  canShare: boolean;
  onReload: () => Promise<void>;
}

export default function ShareProposalButton({ deal, canShare, onReload }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  const token = deal.share_token;
  const shareUrl = token ? `${window.location.origin}/proposta/${token}` : "";
  const firstName = (deal.person.full_name || "").trim().split(/\s+/)[0] || "";
  const waHref = token
    ? `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(
        `Olá ${firstName}! Segue sua proposta Vila Park: ${shareUrl}`,
      )}`
    : "";

  const ensureToken = async () => {
    if (token) return token;
    setBusy(true);
    try {
      const newToken =
        (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { error } = await supabase
        .from("crm_deals")
        .update({ share_token: newToken, shared_at: new Date().toISOString() })
        .eq("id", deal.id);
      if (error) throw error;
      await onReload();
      return newToken;
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "link da proposta", action: "criar" });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async (o: boolean) => {
    if (o && !token) {
      const t = await ensureToken();
      if (!t) return;
    }
    setOpen(o);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  const deactivate = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("crm_deals")
        .update({ share_token: null, shared_at: null })
        .eq("id", deal.id);
      if (error) throw error;
      toast.success("Link desativado. O cliente não conseguirá mais acessar.");
      setConfirmOff(false);
      setOpen(false);
      await onReload();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "link da proposta", action: "atualizar" });
    } finally {
      setBusy(false);
    }
  };

  const btn = (
    <Button
      variant="outline"
      size="sm"
      className="h-8"
      disabled={!canShare || busy}
      aria-label="Compartilhar com o cliente"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <Share2 className="h-3.5 w-3.5 mr-1" />
      )}
      Compartilhar
    </Button>
  );

  return (
    <div className="flex items-center gap-1.5">
      {token && (
        <span className="text-[10px] rounded-full border border-emerald-600/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 px-2 py-0.5">
          link ativo
        </span>
      )}

      {canShare ? (
        <Popover open={open} onOpenChange={handleOpen}>
          <PopoverTrigger asChild>{btn}</PopoverTrigger>
          <PopoverContent align="end" className="w-[340px] p-3 space-y-2.5">
            <p className="text-xs font-medium">Link público do cliente</p>
            <Input value={shareUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
            <div className="grid grid-cols-3 gap-1.5">
              <Button variant="outline" size="sm" className="h-8" onClick={copy}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
              </Button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-8 w-full">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
                </Button>
              </a>
              <a href={waHref} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="h-8 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                </Button>
              </a>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Propostas em rascunho ou recusadas não aparecem para o cliente. Notas internas,
              atividades e motivo de perda ficam ocultos.
            </p>
            <button
              type="button"
              onClick={() => setConfirmOff(true)}
              className="text-[11px] text-destructive hover:underline"
            >
              Desativar link
            </button>
          </PopoverContent>
        </Popover>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{btn}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Envie ao menos uma proposta para compartilhar
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar link público?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente perde o acesso imediatamente. Você pode gerar um novo link depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={deactivate}>
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
