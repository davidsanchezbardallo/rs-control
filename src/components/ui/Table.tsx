import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Tabla profesional: cabecera discreta, filas con separadores finos, cifras alineadas. */
export function Table({ className, children, minWidth = 640 }: { className?: string; children: ReactNode; minWidth?: number }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-[14px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-y border-line bg-surface/60 text-[12px] text-muted">{children}</tr>
    </thead>
  );
}

export function Th({ className, align, ...props }: ComponentProps<"th"> & { align?: "right" | "center" }) {
  return (
    <th
      scope="col"
      className={cn("px-3 py-2.5 font-medium whitespace-nowrap first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6", align === "right" && "text-right", align === "center" && "text-center", className)}
      {...props}
    />
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-surface/60", className)} {...props} />;
}

export function Td({ className, align, ...props }: ComponentProps<"td"> & { align?: "right" | "center" }) {
  return (
    <td
      className={cn("px-3 py-3 align-middle first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6", align === "right" && "tabular text-right", align === "center" && "text-center", className)}
      {...props}
    />
  );
}

export function EmptyRow({ cols, children = "No hay registros." }: { cols: number; children?: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="px-6 py-12 text-center text-[14px] text-muted">
        {children}
      </td>
    </tr>
  );
}
