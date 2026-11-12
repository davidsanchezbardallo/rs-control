"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { deleteDocument } from "../actions";
import { idle } from "@/lib/actions";

export function DeleteDocumentButton({ id }: { id: string }) {
  const [, action, pending] = useActionState(deleteDocument, idle);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("¿Eliminar este documento? Esta acción no se puede deshacer.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} aria-label="Eliminar documento" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
