import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium whitespace-nowrap " +
  "transition-[background-color,box-shadow,color,transform] duration-150 ease-[var(--ease-apple)] " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white shadow-card hover:bg-brand-700",
  secondary: "bg-canvas text-ink ring-1 ring-inset ring-line-strong hover:bg-surface",
  ghost: "text-ink-2 hover:bg-surface hover:text-ink",
  danger: "bg-danger text-white shadow-card hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  // Botones grandes para móvil / trabajadores (objetivo táctil ≥ 48 px)
  lg: "h-12 px-5 text-[15px]",
};

type StyleProps = { variant?: Variant; size?: Size; icon?: ReactNode };

export function buttonClasses({ variant = "primary", size = "md" }: StyleProps = {}) {
  return cn(base, variants[variant], sizes[size]);
}

export function Button({ variant, size, icon, className, children, ...props }: ComponentProps<"button"> & StyleProps) {
  return (
    <button className={cn(buttonClasses({ variant, size }), className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, className, children, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return (
    <Link className={cn(buttonClasses({ variant, size }), className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
