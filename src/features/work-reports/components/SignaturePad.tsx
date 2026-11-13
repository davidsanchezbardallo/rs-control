"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Loader2, PenLine } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

/**
 * Firma con el dedo (o el ratón). Al confirmar, se sube como imagen PNG al
 * almacenamiento privado, en la carpeta del propio usuario.
 */
export function SignaturePad({ label, userId, path, onChange, disabled }: { label: string; userId: string; path: string | null; onChange: (path: string | null) => void; disabled?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [editing, setEditing] = useState(!path);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!editing) return;
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1d1d1f";
  }, [editing]);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent) => {
    if (disabled) return;
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = pos(e);
    const ctx = canvas.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setDirty(true);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const { x, y } = pos(e);
    const ctx = canvas.current!.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => (drawing.current = false);
  const clear = () => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.restore();
    setDirty(false);
  };
  const save = async () => {
    setBusy(true);
    setError(undefined);
    const blob: Blob | null = await new Promise((r) => canvas.current!.toBlob(r, "image/png"));
    if (!blob) {
      setBusy(false);
      return setError("No se ha podido leer la firma.");
    }
    const newPath = `${userId}/${crypto.randomUUID()}.png`;
    const { error } = await createBrowserSupabase().storage.from("signatures").upload(newPath, blob, { contentType: "image/png" });
    setBusy(false);
    if (error) return setError("No se ha podido guardar la firma. Comprueba la conexión.");
    onChange(newPath);
    setEditing(false);
    setDirty(false);
  };

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-ink-2">{label}</p>
      {!editing && path ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/firmas?p=${encodeURIComponent(path)}`} alt={label} className="h-24 w-full max-w-sm rounded-[var(--radius-md)] bg-canvas object-contain ring-1 ring-line" />
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" icon={<PenLine className="h-4 w-4" />} onClick={() => setEditing(true)}>
              Volver a firmar
            </Button>
          )}
        </div>
      ) : (
        <>
          <canvas
            ref={canvas}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            aria-label={`${label}: dibuja la firma`}
            className="h-40 w-full touch-none rounded-[var(--radius-md)] bg-canvas ring-1 ring-line-strong"
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" icon={<Eraser className="h-4 w-4" />} onClick={clear} disabled={!dirty || busy}>
              Borrar
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={save} disabled={!dirty || busy} icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
              {busy ? "Guardando…" : "Aceptar firma"}
            </Button>
            {path && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </div>
        </>
      )}
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
