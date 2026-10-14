import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errMsg } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/plans/new")({
  head: () => ({ meta: [{ title: "Create Plan — TaskBridge" }, { name: "description", content: "Create a new work plan." }, { property: "og:title", content: "Create Plan — TaskBridge" }, { property: "og:description", content: "Create a new work plan." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewPlan,
});

function NewPlan() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const [f, setF] = useState({ title: "", description: "", goal: "", deadline: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!f.title.trim() || !f.description.trim() || !f.goal.trim()) { setError("Please fill in all required fields."); return; }
    setBusy(true); setError(null);
    const { data, error } = await supabase.from("plans")
      .insert({ user_id: user.id, title: f.title.trim(), description: f.description.trim(), goal: f.goal.trim(), deadline: f.deadline || null })
      .select("id").single();
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    toast.success("Plan created");
    qc.invalidateQueries({ queryKey: ["plans"] });
    navigate({ to: "/plans/$planId", params: { planId: data.id } });
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-2xl font-bold">Create Plan</h1>
      <p className="mt-1 text-sm text-muted-foreground">You can add tasks after creating the plan.</p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <div className="space-y-2"><Label htmlFor="title">Plan Title *</Label><Input id="title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="desc">Task Description *</Label><Textarea id="desc" required rows={5} placeholder="Paste or describe the request you received" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="goal">Desired Outcome *</Label><Textarea id="goal" required rows={3} value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="deadline">Deadline (optional)</Label><Input id="deadline" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create Plan"}</Button>
      </form>
    </div>
  );
}
