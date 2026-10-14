import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { calcProgress, errMsg, PRIORITIES, STATUSES, toDeliverables } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/plans/$planId")({
  head: () => ({ meta: [{ title: "Plan — TaskBridge" }, { name: "description", content: "Plan details and tasks." }, { property: "og:title", content: "Plan — TaskBridge" }, { property: "og:description", content: "Plan details and tasks." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PlanPage,
});

const selectCls = "h-9 rounded-md border border-input bg-background px-2 text-sm";

type Task = { id: string; title: string; description: string | null; priority: string; status: string; sort_order: number };

function PlanPage() {
  const { planId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const key = ["plan", planId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*, plan_tasks(*)").eq("id", planId).maybeSingle();
      if (error) throw error;
      if (data) data.plan_tasks.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
      return data;
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["plans"] }); };
  const [editing, setEditing] = useState(false);

  const delPlan = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("plans").delete().eq("id", planId); if (error) throw error; },
    onSuccess: () => { toast.success("Plan deleted"); qc.invalidateQueries({ queryKey: ["plans"] }); navigate({ to: "/plans" }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const updTask = useMutation({
    mutationFn: async (v: { id: string; patch: Partial<Task> }) => { const { error } = await supabase.from("plan_tasks").update(v.patch).eq("id", v.id); if (error) throw error; },
    onSuccess: refresh, onError: (e) => toast.error(errMsg(e)),
  });
  const delTask = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("plan_tasks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Task deleted"); refresh(); }, onError: (e) => toast.error(errMsg(e)),
  });

  if (q.isLoading) return <p className="text-muted-foreground">Loading plan…</p>;
  if (q.error) return <p role="alert" className="text-destructive">Couldn't load plan: {errMsg(q.error)}</p>;
  if (!q.data) return <div className="text-center"><p className="font-medium">Plan not found.</p><Link to="/plans" className="text-primary hover:underline">Back to My Plans</Link></div>;

  const p = q.data;
  const pr = calcProgress(p.plan_tasks);
  const deliverables = toDeliverables(p.deliverables);

  return (
    <div className="space-y-6">
      <Link to="/plans" className="text-sm text-muted-foreground hover:text-foreground">← My Plans</Link>
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        {editing ? <PlanForm plan={p} onDone={() => { setEditing(false); refresh(); }} /> : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-display text-2xl font-bold">{p.title}</h1>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit Plan</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="outline" disabled={delPlan.isPending}>Delete Plan</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete this plan?</AlertDialogTitle><AlertDialogDescription>The plan and all its tasks will be permanently deleted.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => delPlan.mutate()}>Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <Field label="Task description" className="sm:col-span-2"><span className="whitespace-pre-wrap">{p.description}</span></Field>
              <Field label="Goal">{p.goal}</Field>
              <Field label="Deadline">{p.deadline ?? "Not set"}</Field>
              <Field label="Deliverables">{deliverables.length ? <ul className="list-disc pl-5">{deliverables.map((d, i) => <li key={i}>{d}</li>)}</ul> : <span className="text-muted-foreground">None added</span>}</Field>
              <Field label="Next step">{p.next_step || <span className="text-muted-foreground">Not set</span>}</Field>
            </dl>
          </>
        )}
        <div className="mt-6">
          <div className="flex justify-between text-sm"><span>{pr.done} of {pr.total} tasks done</span><span className="font-medium">{pr.percent}%</span></div>
          <Progress value={pr.percent} className="mt-2" />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Tasks</h2>
        <AddTask planId={planId} userId={user.id} nextOrder={p.plan_tasks.length} onAdded={refresh} />
        {p.plan_tasks.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No tasks yet. Add your first task above.</p>}
        <ul className="mt-4 divide-y">
          {p.plan_tasks.map((t) => (
            <TaskRow key={t.id} task={t} busy={updTask.isPending || delTask.isPending}
              onPatch={(patch) => updTask.mutateAsync({ id: t.id, patch })}
              onDelete={() => delTask.mutate(t.id)} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1">{children}</dd></div>;
}

function PlanForm({ plan, onDone }: { plan: { id: string; title: string; description: string; goal: string; deadline: string | null; deliverables: unknown; next_step: string | null }; onDone: () => void }) {
  const [f, setF] = useState({ title: plan.title, description: plan.description, goal: plan.goal, deadline: plan.deadline ?? "", deliverables: toDeliverables(plan.deliverables).join("\n"), next_step: plan.next_step ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!f.title.trim() || !f.description.trim() || !f.goal.trim()) { setError("Title, description and goal are required."); return; }
    setBusy(true); setError(null);
    const { error } = await supabase.from("plans").update({
      title: f.title.trim(), description: f.description.trim(), goal: f.goal.trim(), deadline: f.deadline || null,
      deliverables: f.deliverables.split("\n").map((s) => s.trim()).filter(Boolean), next_step: f.next_step.trim() || null,
    }).eq("id", plan.id);
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    toast.success("Plan updated"); onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="e-title">Title *</Label><Input id="e-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="e-desc">Task description *</Label><Textarea id="e-desc" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="e-goal">Goal *</Label><Textarea id="e-goal" rows={2} value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="e-del">Deliverables (one per line)</Label><Textarea id="e-del" rows={3} value={f.deliverables} onChange={(e) => setF({ ...f, deliverables: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="e-next">Next step</Label><Input id="e-next" value={f.next_step} onChange={(e) => setF({ ...f, next_step: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="e-dl">Deadline</Label><Input id="e-dl" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button><Button type="button" variant="ghost" onClick={onDone} disabled={busy}>Cancel</Button></div>
    </form>
  );
}

function AddTask({ planId, userId, nextOrder, onAdded }: { planId: string; userId: string; nextOrder: number; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true); setError(null);
    const { error } = await supabase.from("plan_tasks").insert({ plan_id: planId, user_id: userId, title: title.trim(), priority, sort_order: nextOrder });
    setBusy(false);
    if (error) { setError(errMsg(error)); return; }
    setTitle(""); onAdded();
  }
  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
      <Label htmlFor="new-task" className="sr-only">New task</Label>
      <Input id="new-task" placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Label htmlFor="new-pri" className="sr-only">Priority</Label>
      <select id="new-pri" className={selectCls} value={priority} onChange={(e) => setPriority(e.target.value)}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
      <Button type="submit" disabled={busy || !title.trim()}>{busy ? "Adding…" : "Add Task"}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

function TaskRow({ task, busy, onPatch, onDelete }: { task: Task; busy: boolean; onPatch: (p: Partial<Task>) => Promise<void>; onDelete: () => void }) {
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try { await onPatch({ title: title.trim(), description: desc.trim() || null }); setEdit(false); } catch { /* toast shown */ } finally { setSaving(false); }
  }
  return (
    <li className="py-3">
      {edit ? (
        <form onSubmit={save} className="space-y-2">
          <Input aria-label="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea aria-label="Task description" rows={2} placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="flex gap-2"><Button size="sm" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Button size="sm" variant="ghost" type="button" onClick={() => setEdit(false)}>Cancel</Button></div>
        </form>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className={task.status === "Done" ? "text-muted-foreground line-through" : "font-medium"}>{task.title}</p>
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {task.priority === "High" && <Badge variant="destructive">High</Badge>}
            <select aria-label="Priority" className={selectCls} value={task.priority} disabled={busy} onChange={(e) => onPatch({ priority: e.target.value }).catch(() => {})}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
            <select aria-label="Status" className={selectCls} value={task.status} disabled={busy} onChange={(e) => onPatch({ status: e.target.value }).catch(() => {})}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <Button size="sm" variant="ghost" onClick={() => setEdit(true)}>Edit</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="sm" variant="ghost" disabled={busy}>Delete</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete task?</AlertDialogTitle><AlertDialogDescription>"{task.title}" will be removed.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </li>
  );
}
