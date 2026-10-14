import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskBridge — Turn unclear requests into clear plans" },
      { name: "description", content: "TaskBridge helps freelancers break work requests into tasks, priorities and deliverables, and track progress." },
      { property: "og:title", content: "TaskBridge" },
      { property: "og:description", content: "Turn unclear requests into clear, actionable plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <span className="font-display text-xl font-bold">TaskBridge</span>
        <Button asChild variant="ghost"><Link to="/auth">Sign In</Link></Button>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
        <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">For freelancers & early-career pros</p>
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">
          Turn unclear requests into clear, actionable plans.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Capture what a client asked for, define the outcome, break it into prioritized tasks, and see exactly how far along you are.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Get Started</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">Sign In</Link></Button>
        </div>
      </main>
    </div>
  );
}
