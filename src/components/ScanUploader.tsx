import { useRef, useState, type DragEvent } from "react";
import { Camera, Upload, Loader2, Wrench, RotateCcw, AlertTriangle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { diagnoseDevice } from "@/lib/diagnostics.functions";

export function ScanUploader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const diagnose = useServerFn(diagnoseDevice);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setHint("");
    setProgress(0);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  async function run() {
    if (!file || !user) return;
    setLoading(true);
    setError(null);
    setProgress(10);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      setProgress(25);
      const { error: upErr } = await supabase.storage
        .from("device-images")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      setProgress(55);
      const { data: pub } = supabase.storage.from("device-images").getPublicUrl(path);
      setProgress(70);
      const result = await diagnose({ data: { imageUrl: pub.publicUrl, deviceHint: hint || undefined } });
      setProgress(100);
      toast.success("Diagnosis ready");
      navigate({ to: "/scan/$id", params: { id: result.id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
      setLoading(false);
      setProgress(0);
    }
  }

  return (
    <Card
      className="overflow-hidden border-border/60 p-6 md:p-8"
      style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elegant)" }}
    >
      {!previewUrl ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-6 rounded-xl border-2 border-dashed py-10 transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border/70"
          }`}
        >
          <div
            className="grid h-20 w-20 place-items-center rounded-2xl"
            style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
          >
            <Camera className="h-9 w-9 text-primary-foreground" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">Show us the damage</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag & drop an image, take a photo, or pick a file.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => cameraRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" /> Take photo
            </Button>
            <Button size="lg" variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Upload image
            </Button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-border/60">
            <img src={previewUrl} alt="Device to diagnose" className="max-h-96 w-full object-contain bg-background" />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="hint">
              Anything we should know? (optional)
            </label>
            <input
              id="hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. iPhone 13, screen went black after a drop"
              className="w-full rounded-lg border border-input bg-input/40 px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {progress < 60 ? "Uploading image…" : progress < 100 ? "Analyzing with AI…" : "Done"}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={run} disabled={loading}>
              {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Diagnosing…</>) :
                (<><Wrench className="mr-2 h-4 w-4" /> Diagnose & estimate</>)}
            </Button>
            <Button size="lg" variant="secondary" onClick={reset} disabled={loading}>
              <RotateCcw className="mr-2 h-4 w-4" /> Use a different photo
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}