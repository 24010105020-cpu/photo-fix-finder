import { createFileRoute } from "@tanstack/react-router";
import { ScanUploader } from "@/components/ScanUploader";

export const Route = createFileRoute("/_authenticated/scan")({
  component: ScanPage,
  head: () => ({ meta: [{ title: "New scan — FixLens" }] }),
});

function ScanPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">New diagnostic scan</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload a clear, well-lit photo of the damaged device.
      </p>
      <div className="mt-6">
        <ScanUploader />
      </div>
    </main>
  );
}