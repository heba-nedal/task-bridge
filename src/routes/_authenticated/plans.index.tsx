import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { calcProgress, errMsg } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/plans/")({
  head: () => ({ meta: [{ title: "My Plans — TaskBridge" }, { name: "description", content: "Your saved TaskBridge plans." }, { property: "og:title", content: "My Plans — TaskBridge" }, { property: "og:description", content: "Your saved plans." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MyPlans,
});

function MyPlans() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("id,title,goal,deadline,created_at,plan_tasks(status)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("plans").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Plan deleted"); qc.invalidateQueries({ queryKey: ["plans"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">My Plans</h1>
        <Button asChild><Link to="/plans/new">Create New Plan</Link></Button>
      </div>
      {q.isLoading && <p className="text-muted-foreground">Loading plans…</p>}
      {q.error && <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Couldn't load plans: {errMsg(q.error)} <Button variant="link" onClick={() => q.refetch()}>Retry</Button></div>}
      {q.data && q.data.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <p className="font-medium">No plans yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first plan to break a request into tasks.</p>
          <Button asChild className="mt-4"><Link to="/plans/new">Create New Plan</Link></Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {q.data?.map((p) => {
          const pr = calcProgress(p.plan_tasks);
          return (
            <div key={p.id} className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="font-display text-lg font-semibold">{p.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.goal}</p>
              {p.deadline && <p className="mt-2 text-xs text-muted-foreground">Due {p.deadline}</p>}
              <div className="mt-4 flex items-center justify-between text-sm"><span>{pr.done} / {pr.total} tasks done</span><span className="font-medium">{pr.percent}%</span></div>
              <Progress value={pr.percent} className="mt-2" />
              <div className="mt-5 flex gap-2">
                <Button asChild size="sm"><Link to="/plans/$planId" params={{ planId: p.id }}>Open Plan</Link></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="outline" disabled={del.isPending}>Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete "{p.title}"?</AlertDialogTitle><AlertDialogDescription>This permanently deletes the plan and all its tasks.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(p.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
