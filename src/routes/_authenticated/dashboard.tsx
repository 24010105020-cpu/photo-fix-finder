import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImageOff, Loader2, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyDiagnostics } from "@/lib/diagnostics.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — FixLens" }] }),
});

const urgencyStyles: Record<string, string> = {
  low: "bg-primary/15 text-primary border-primary/30",
  medium: "bg-accent/15 text-accent border-accent/30",
  high: "bg-destructive/15 text-destructive border-destructive/40",
  critical: "bg-destructive/25 text-destructive border-destructive/60",
};

function Dashboard() {
  const fetchList = useServerFn(listMyDiagnostics);
  const { data, isLoading, error } = useQuery({
    queryKey: ["diagnostics"],
    queryFn: () => fetchList(),
  });
  const router = useRouter();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your scans</h1>
          <p className="mt-1 text-sm text-muted-foreground">All your AI device diagnostics in one place.</p>
        </div>
        <Link to="/scan">
          <Button><Plus className="mr-2 h-4 w-4" /> New scan</Button>
        </Link>
      </div>

      <div className="mt-8">
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-6 text-sm text-destructive">
            Could not load your scans. <Button variant="ghost" size="sm" onClick={() => router.invalidate()}>Retry</Button>
          </Card>
        )}

        {!isLoading && data && data.length === 0 && (
          <Card className="flex flex-col items-center gap-4 p-12 text-center"
            style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elegant)" }}>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Camera className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">No scans yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Run your first AI diagnostic to see it here.</p>
            </div>
            <Link to="/scan"><Button><Plus className="mr-2 h-4 w-4" /> Start a scan</Button></Link>
          </Card>
        )}

        {data && data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((d) => (
              <Link key={d.id} to="/scan/$id" params={{ id: d.id }}>
                <Card className="group h-full overflow-hidden border-border/60 transition-transform hover:-translate-y-0.5 hover:border-primary/40"
                  style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elegant)" }}>
                  <div className="aspect-[4/3] w-full overflow-hidden bg-background/60">
                    {d.image_url ? (
                      <img src={d.image_url} alt={d.device_type ?? "Device"} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageOff className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="line-clamp-1 font-medium">{d.device_type ?? "Unknown device"}</h3>
                      {d.repair_urgency && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${urgencyStyles[d.repair_urgency] ?? ""}`}>
                          {d.repair_urgency}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{d.ai_diagnosis}</p>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
                      <span className="font-semibold text-primary">
                        ${d.estimated_repair_cost_min ?? "?"}–${d.estimated_repair_cost_max ?? "?"}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isLoading && <Loader2 className="sr-only" />}
      <Wrench className="sr-only" />
    </main>
  );
}