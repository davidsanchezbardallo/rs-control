import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
