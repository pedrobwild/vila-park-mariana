import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CustomFieldDef,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/lib/units";

interface Props {
  def: CustomFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}

export default function DynamicFieldInput({ def, value, onChange }: Props) {
  const id = `cf-${def.id}`;
  const options = Array.isArray(def.options) ? (def.options as unknown[]) : [];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{def.label}</Label>

      {def.field_type === "text" && (
        <Input
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {def.field_type === "number" && (
        <Input
          id={id}
          type="number"
          value={(value as number | string) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      )}

      {def.field_type === "currency" && (
        <Input
          id={id}
          inputMode="numeric"
          value={typeof value === "number" ? formatCurrencyInput(value) : (value as string) ?? ""}
          onChange={(e) => onChange(parseCurrencyInput(e.target.value))}
          placeholder="R$ 0,00"
        />
      )}

      {def.field_type === "date" && (
        <Input
          id={id}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {def.field_type === "boolean" && (
        <div className="flex items-center gap-2 pt-1">
          <Switch
            id={id}
            checked={!!value}
            onCheckedChange={(v) => onChange(v)}
          />
          <span className="text-sm text-muted-foreground">{value ? "Sim" : "Não"}</span>
        </div>
      )}

      {def.field_type === "select" && (
        <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt, i) => (
              <SelectItem key={i} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
