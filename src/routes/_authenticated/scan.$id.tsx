import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { jsPDF } from "jspdf";
import {
  ArrowLeft, CheckCircle2, Download, Loader2, Wrench, AlertTriangle, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyDiagnostic, type Diagnostic } from "@/lib/diagnostics.functions";

export const Route = createFileRoute("/_authenticated/scan/$id")({
  component: ScanDetail,
  head: () => ({ meta: [{ title: "Diagnostic report — FixLens" }] }),
});

const severityStyles: Record<string, string> = {
  low: "bg-primary/15 text-primary border-primary/30",
  medium: "bg-accent/15 text-accent border-accent/30",
  high: "bg-destructive/15 text-destructive border-destructive/40",
};

const urgencyStyles: Record<string, string> = {
  low: "bg-primary/15 text-primary border-primary/30",
  medium: "bg-accent/15 text-accent border-accent/30",
  high: "bg-destructive/15 text-destructive border-destructive/40",
  critical: "bg-destructive/25 text-destructive border-destructive/60",
};

function ScanDetail() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getMyDiagnostic);
  const { data, isLoading, error } = useQuery({
    queryKey: ["diagnostic", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-72 w-full" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Card className="p-6 text-sm text-destructive">Could not load this report.</Card>
      </main>
    );
  }

  if (!data) throw notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <DiagnosticView d={data} />
    </main>
  );
}

function DiagnosticView({ d }: { d: Diagnostic }) {
  function download() {
    const doc = new jsPDF();
    let y = 14;
    doc.setFontSize(18);
    doc.text("FixLens diagnostic report", 14, y); y += 10;
    doc.setFontSize(11);
    doc.text(`Device: ${d.device_type ?? "Unknown"}`, 14, y); y += 7;
    doc.text(`Scan date: ${new Date(d.created_at).toLocaleString()}`, 14, y); y += 7;
    doc.text(`Confidence: ${d.confidence_score ?? "n/a"}`, 14, y); y += 7;
    doc.text(`Urgency: ${d.repair_urgency ?? "n/a"}`, 14, y); y += 7;
    doc.text(`Repair time: ${d.repair_time ?? "n/a"}`, 14, y); y += 7;
    doc.text(`Estimated cost: $${d.estimated_repair_cost_min ?? "?"}–$${d.estimated_repair_cost_max ?? "?"}`, 14, y); y += 10;
    doc.setFontSize(13); doc.text("Diagnosis", 14, y); y += 7;
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(d.ai_diagnosis ?? "", 180), 14, y);
    y += (doc.splitTextToSize(d.ai_diagnosis ?? "", 180).length * 5) + 5;
    doc.setFontSize(13); doc.text("Problems", 14, y); y += 7;
    doc.setFontSize(10);
    d.problems.forEach((p, i) => {
      const block = `${i + 1}. ${p.name} (${p.severity}) — ${p.description} Likely cause: ${p.likely_cause}`;
      const lines = doc.splitTextToSize(block, 180);
      doc.text(lines, 14, y); y += lines.length * 5 + 2;
    });
    y += 4;
    doc.setFontSize(13); doc.text("Recommended solution", 14, y); y += 7;
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(d.recommended_solution ?? "", 180), 14, y);
    doc.save(`fixlens-${d.id.slice(0, 8)}.pdf`);
  }

  return (
    <>
      {d.image_url && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
          <img src={d.image_url} alt={d.device_type ?? "Device"} className="max-h-[420px] w-full object-contain bg-background" />
        </div>
      )}

      <Card className="mt-6 overflow-hidden border-border/60 p-6 md:p-8"
        style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Diagnosis</p>
            <h2 className="mt-1 text-2xl font-semibold">{d.device_type}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Scanned {new Date(d.created_at).toLocaleString()} · Confidence{" "}
              <span className="capitalize">{d.confidence_score}</span> · Repair time {d.repair_time}
            </p>
            {d.repair_urgency && (
              <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs capitalize ${urgencyStyles[d.repair_urgency] ?? ""}`}>
                Urgency: {d.repair_urgency}
              </span>
            )}
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Estimated cost</p>
            <p className="text-2xl font-bold text-primary">
              ${d.estimated_repair_cost_min}–${d.estimated_repair_cost_max}
            </p>
          </div>
        </div>

        {d.ai_diagnosis && (
          <p className="mt-6 text-sm leading-relaxed text-foreground/90">{d.ai_diagnosis}</p>
        )}

        <div className="mt-6">
          {d.problems.length === 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
              <p className="text-sm">No obvious problems detected from this photo.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {d.problems.map((p, i) => (
                <li key={i} className="rounded-xl border border-border/60 bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium">{p.name}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${severityStyles[p.severity] ?? ""}`}>
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
          <p className="flex items-center gap-2 font-medium text-accent"><Wrench className="h-4 w-4" /> Recommendation</p>
          <p className="mt-1 text-muted-foreground">{d.recommended_solution}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={download}><Download className="mr-2 h-4 w-4" /> Download PDF report</Button>
          <Link to="/scan"><Button variant="secondary">Run another scan</Button></Link>
        </div>
      </Card>

      <Card className="mt-6 border-border/60 p-6"
        style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Find a technician</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bring this report to any local repair shop. The diagnosis and cost estimate help you
              compare quotes and avoid being overcharged. Search for{" "}
              <a
                className="text-primary underline-offset-4 hover:underline"
                target="_blank" rel="noreferrer"
                href={`https://www.google.com/maps/search/${encodeURIComponent((d.device_type ?? "device") + " repair near me")}`}
              >
                "{d.device_type} repair near me"
              </a>
              .
            </p>
          </div>
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        <AlertTriangle className="mr-1 inline h-3 w-3" />
        Estimates are based on typical third-party repair shop rates and may vary by region and parts availability.
      </p>
      <Loader2 className="sr-only" />
    </>
  );
}