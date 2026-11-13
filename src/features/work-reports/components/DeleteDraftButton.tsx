"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { idle } from "@/lib/actions";
import { deleteDraft } from "../actions";

export function DeleteDraftButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteDraft, idle);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("¿Borrar este borrador? No se puede deshacer.")) e.preventDefault(); }} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" className="w-full text-danger" disabled={pending} icon={<Trash2 className="h-4 w-4" />}>
        Borrar borrador
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
