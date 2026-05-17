import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { diagnoseDevice } from "@/lib/diagnose.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, Loader2, Wrench, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "FixLens — Snap. Diagnose. Get a repair quote." },
      {
        name: "description",
        content:
          "Take a photo of your broken phone, laptop, or tablet and get an instant AI diagnosis with estimated repair cost.",
      },
    ],
  }),
});

type Diagnosis = Awaited<ReturnType<typeof diagnoseDevice>>;

const severityStyles: Record<string, string> = {
  low: "bg-primary/15 text-primary border-primary/30",
  medium: "bg-accent/15 text-accent border-accent/30",
  high: "bg-destructive/15 text-destructive border-destructive/40",
};

function Index() {
  const diagnose = useServerFn(diagnoseDevice);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Diagnosis | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function runDiagnosis() {
    if (!imageDataUrl) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await diagnose({ data: { imageDataUrl, deviceHint: hint || undefined } });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setImageDataUrl(null);
    setResult(null);
    setError(null);
    setHint("");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Ambient gradient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 10%, oklch(0.78 0.18 155 / 0.25), transparent 70%), radial-gradient(50% 50% at 90% 80%, oklch(0.7 0.18 50 / 0.22), transparent 70%)",
        }}
      />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
          >
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">FixLens</span>
        </div>
        <span className="text-xs text-muted-foreground">AI device diagnostics</span>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-8 pt-6 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
          Snap it.{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            We diagnose it.
          </span>
        </h1>
        <p className="mt-4 text-pretty text-base text-muted-foreground md:text-lg">
          Upload a photo of your broken device. Our AI spots the problem and gives you an
          honest repair estimate in seconds.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <Card
          className="overflow-hidden border-border/60 p-6 md:p-8"
          style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elegant)" }}
        >
          {!imageDataUrl ? (
            <div className="flex flex-col items-center gap-6 py-10">
              <div
                className="grid h-20 w-20 place-items-center rounded-2xl"
                style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
              >
                <Camera className="h-9 w-9 text-primary-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Show us the damage</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A clear, well-lit photo gives the best diagnosis.
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
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-xl border border-border/60">
                <img src={imageDataUrl} alt="Device to diagnose" className="max-h-96 w-full object-contain bg-background" />
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

              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={runDiagnosis} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Diagnosing…
                    </>
                  ) : (
                    <>
                      <Wrench className="mr-2 h-4 w-4" /> Diagnose & estimate
                    </>
                  )}
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

        {result && (
          <Card
            className="mt-6 overflow-hidden border-border/60 p-6 md:p-8"
            style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elegant)" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Diagnosis</p>
                <h2 className="mt-1 text-2xl font-semibold">{result.device}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confidence: <span className="capitalize">{result.confidence}</span> · Repair time: {result.repair_time}
                </p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Estimated cost</p>
                <p className="text-2xl font-bold text-primary">
                  ${result.estimated_price_usd.min}–${result.estimated_price_usd.max}
                </p>
              </div>
            </div>

            <div className="mt-6">
              {result.problems.length === 0 ? (
                <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="text-sm">No obvious problems detected from this photo.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {result.problems.map((p, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-border/60 bg-background/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-medium">{p.name}</h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs capitalize ${severityStyles[p.severity] ?? ""}`}
                        >
                          {p.severity} severity
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="text-foreground/70">Likely cause:</span> {p.likely_cause}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm">
              <p className="font-medium text-accent">Recommendation</p>
              <p className="mt-1 text-muted-foreground">{result.recommendation}</p>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Estimates are based on typical third-party repair shop rates and may vary by region and parts availability.
            </p>
          </Card>
        )}
      </section>
    </main>
  );
}
