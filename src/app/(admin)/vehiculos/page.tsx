import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import { MODULES } from "@/lib/navigation/modules";

export const metadata: Metadata = { title: MODULES.vehiculos.title };

export default function Page() {
  return <ModulePlaceholder module={MODULES.vehiculos} />;
}
