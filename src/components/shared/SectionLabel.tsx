import type { ReactNode } from "react";

export default function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow mb-3 ${className}`}>{children}</p>;
}
