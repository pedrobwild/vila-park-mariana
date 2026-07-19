import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppNavbar from "@/components/AppNavbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, FileText, ImageIcon, MessageCircle, Search } from "lucide-react";
import { WHATSAPP_PHONE } from "@/data/surroundings";
import {
  CustomFieldDef,
  Unit,
  UnitStatus,
  STATUS_LABEL,
  STATUS_BADGE,
  formatArea,
  formatBRL,
  formatCustomValue,
} from "@/lib/units";

type SortOpt = "code" | "price_asc" | "price_desc" | "area_asc" | "area_desc";

export default function Oportunidades() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [block, setBlock] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<SortOpt>("code");

  const [lightbox, setLightbox] = useState<Unit | null>(null);

  useEffect(() => {
    (async () => {
      const [u, f, v] = await Promise.all([
        supabase.from("units").select("*"),
        supabase
          .from("custom_field_definitions")
          .select("*")
          .eq("visible_public", true)
          .order("sort_order"),
        supabase.from("custom_field_values").select("*"),
      ]);
      setUnits((u.data ?? []) as Unit[]);
      setFields((f.data ?? []) as CustomFieldDef[]);
      const map: Record<string, Record<string, unknown>> = {};
      (v.data ?? []).forEach((r) => {
        map[r.unit_id] = map[r.unit_id] ?? {};
        map[r.unit_id][r.field_id] = r.value;
      });
      setValues(map);
      setLoading(false);
    })();
  }, []);

  const blocks = useMemo(
    () => Array.from(new Set(units.map((u) => u.block))).sort(),
    [units],
  );

  const filtered = useMemo(() => {
    const min = minPrice ? Number(minPrice.replace(/\D/g, "")) : 0;
    const max = maxPrice ? Number(maxPrice.replace(/\D/g, "")) : Infinity;
    const qq = q.trim().toLowerCase();
    const list = units.filter((u) => {
      if (block !== "all" && u.block !== block) return false;
      if (status !== "all" && u.status !== status) return false;
      const p = Number(u.price_brl);
      if (p < min || p > max) return false;
      if (qq && !u.code.toLowerCase().includes(qq)) return false;
      return true;
    });
    list.sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return Number(a.price_brl) - Number(b.price_brl);
        case "price_desc":
          return Number(b.price_brl) - Number(a.price_brl);
        case "area_asc":
          return Number(a.area_m2) - Number(b.area_m2);
        case "area_desc":
          return Number(b.area_m2) - Number(a.area_m2);
        default:
          return a.code.localeCompare(b.code);
      }
    });
    return list;
  }, [units, block, status, minPrice, maxPrice, q, sort]);

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-2xl md:text-3xl font-bold">Oportunidades</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Unidades disponíveis para compra no Vila Park Mariana. Consulte metragens, plantas e valores.
          </p>
        </header>

        {/* Filters — only when there are units */}
        {!loading && units.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2 rounded-lg border border-border bg-card p-3">
            <div className="relative col-span-2">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar código…"
                className="pl-8"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={block} onValueChange={setBlock}>
              <SelectTrigger><SelectValue placeholder="Bloco" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os blocos</SelectItem>
                {blocks.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {(["disponivel", "reservado", "vendido"] as UnitStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              inputMode="numeric"
              placeholder="Preço mín."
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <Input
              inputMode="numeric"
              placeholder="Preço máx."
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
            <Select value={sort} onValueChange={(v) => setSort(v as SortOpt)}>
              <SelectTrigger className="md:ml-auto"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="code">Código (A→Z)</SelectItem>
                <SelectItem value="price_asc">Menor preço</SelectItem>
                <SelectItem value="price_desc">Maior preço</SelectItem>
                <SelectItem value="area_asc">Menor metragem</SelectItem>
                <SelectItem value="area_desc">Maior metragem</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Carregando…</div>
        ) : units.length === 0 ? (
          <div className="text-center py-20 rounded-lg border border-dashed border-border bg-muted/20 space-y-4">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-display text-lg font-semibold">Novas oportunidades em breve</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Ainda não há unidades publicadas. Fale com o time Vila Park para conhecer disponibilidades e reservas antecipadas.
              </p>
            </div>
            <a
              href={`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent("Olá! Gostaria de saber sobre oportunidades no Vila Park Vila Mariana.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button size="lg" className="gap-2 min-h-[44px]">
                <MessageCircle className="h-4 w-4" /> Falar com o time Vila Park
              </Button>
            </a>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-lg border border-dashed border-border bg-muted/20 space-y-3">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma unidade encontrada com esses filtros.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setQ(""); setBlock("all"); setStatus("all");
                setMinPrice(""); setMaxPrice(""); setSort("code");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Código</th>
                    <th className="text-left px-3 py-2 font-medium">Bloco</th>
                    <th className="text-left px-3 py-2 font-medium">Metragem</th>
                    <th className="text-left px-3 py-2 font-medium">Preço</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Planta</th>
                    {fields.map((f) => (
                      <th key={f.id} className="text-left px-3 py-2 font-medium">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{u.code}</td>
                      <td className="px-3 py-2">{u.block}</td>
                      <td className="px-3 py-2">{formatArea(Number(u.area_m2))}</td>
                      <td className="px-3 py-2 font-semibold">{formatBRL(Number(u.price_brl))}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${STATUS_BADGE[u.status as UnitStatus]}`}>
                          {STATUS_LABEL[u.status as UnitStatus]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {u.planta_url ? (
                          u.planta_mime === "application/pdf" ? (
                            <a href={u.planta_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                              <FileText className="h-3.5 w-3.5" /> Abrir PDF
                            </a>
                          ) : (
                            <button onClick={() => setLightbox(u)} className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                              <ImageIcon className="h-3.5 w-3.5" /> Ver planta
                            </button>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {fields.map((f) => (
                        <td key={f.id} className="px-3 py-2">
                          {formatCustomValue(f, values[u.id]?.[f.id])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((u) => (
                <div key={u.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{u.code} · Bloco {u.block}</p>
                      <p className="text-sm text-muted-foreground">{formatArea(Number(u.area_m2))}</p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${STATUS_BADGE[u.status as UnitStatus]}`}>
                      {STATUS_LABEL[u.status as UnitStatus]}
                    </span>
                  </div>
                  <p className="text-lg font-bold">{formatBRL(Number(u.price_brl))}</p>
                  {u.planta_url && (
                    u.planta_mime === "application/pdf" ? (
                      <a href={u.planta_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary text-sm">
                        <FileText className="h-4 w-4" /> Abrir PDF
                      </a>
                    ) : (
                      <button onClick={() => setLightbox(u)} className="inline-flex items-center gap-1 text-primary text-sm">
                        <ImageIcon className="h-4 w-4" /> Ver planta
                      </button>
                    )
                  )}
                  {fields.length > 0 && (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-2 border-t border-border">
                      {fields.map((f) => (
                        <div key={f.id}>
                          <dt className="text-muted-foreground">{f.label}</dt>
                          <dd>{formatCustomValue(f, values[u.id]?.[f.id])}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
              <p className="font-display font-semibold">Interessou por alguma unidade?</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Fale com o time Vila Park e receba condições, disponibilidade atualizada e agende uma visita.
              </p>
              <a
                href={`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent("Olá! Tenho interesse em uma unidade no Vila Park Vila Mariana.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button size="lg" className="gap-2 min-h-[44px]">
                  <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
                </Button>
              </a>
            </div>
          </>
        )}
      </main>


      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Planta · {lightbox?.code}</DialogTitle>
          </DialogHeader>
          {lightbox?.planta_url && (
            <img
              src={lightbox.planta_url}
              alt={`Planta ${lightbox.code}`}
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
