import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function KpiCard({
  value,
  label,
  highlight = false,
}: { value: string; label: string; highlight?: boolean }) {
  return (
    <Card className={cn("card-elevated border-border/60 overflow-hidden", highlight && "border-accent/30 bg-accent/5")}>
      <CardContent className="p-4 sm:p-5">
        <p className={cn(
          "font-display font-medium leading-tight tabular text-2xl sm:text-3xl xl:text-4xl",
          highlight ? "text-accent-foreground" : "text-foreground",
        )}
        style={highlight ? { color: "hsl(var(--accent-strong))" } : undefined}>
          {value}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
