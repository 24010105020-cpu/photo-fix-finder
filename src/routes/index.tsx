import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Camera, Sparkles, ShieldCheck, Wrench, Zap, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "FixLens — Snap. Diagnose. Get a repair quote." },
      {
        name: "description",
        content:
          "Upload a photo of your broken phone, laptop, or tablet and get an instant AI diagnosis with estimated repair cost.",
      },
    ],
  }),
});

function Landing() {
  const { user } = useAuth();
  const ctaTo = user ? "/scan" : "/signup";

  return (
    <main>
      <section className="mx-auto max-w-5xl px-6 pb-12 pt-16 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Sparkles className="h-3.5 w-3.5" /> AI device diagnostics
        </span>
        <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight md:text-6xl">
          Snap it.{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
            We diagnose it.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
          Upload a photo of your broken device. FixLens spots the problem, estimates the repair cost
          and recommends your next step — in seconds.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={ctaTo}>
            <Button size="lg">
              <Camera className="mr-2 h-4 w-4" /> {user ? "Start a scan" : "Get started — it's free"}
            </Button>
          </Link>
          {!user && (
            <Link to="/login">
              <Button size="lg" variant="secondary">I already have an account</Button>
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {[
          { icon: Wrench, title: "Honest diagnosis", body: "AI vision identifies cracked screens, water damage, swollen batteries and more." },
          { icon: Zap, title: "Instant estimate", body: "Get a realistic repair price range based on third-party shop rates." },
          { icon: ShieldCheck, title: "Your history saved", body: "Every scan is stored in your private dashboard for future reference." },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-border/60 p-6"
            style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elegant)" }}
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mb-24 max-w-3xl rounded-3xl border border-border/60 px-6 py-12 text-center"
        style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elegant)" }}>
        <FileText className="mx-auto h-8 w-8 text-accent" />
        <h2 className="mt-3 text-2xl font-semibold">Downloadable repair report</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Take your AI-generated diagnostic to any repair shop and avoid being overcharged.
        </p>
        <div className="mt-6">
          <Link to={ctaTo}>
            <Button size="lg">Try it now</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}