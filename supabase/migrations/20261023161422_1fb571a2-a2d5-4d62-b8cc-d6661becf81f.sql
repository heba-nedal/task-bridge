-- ============ plans ============
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal TEXT NOT NULL,
  deadline DATE,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_step TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plans_id_user_id_key UNIQUE (id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_own" ON public.plans
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "plans_insert_own" ON public.plans
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "plans_update_own" ON public.plans
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "plans_delete_own" ON public.plans
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ plan_tasks ============
CREATE TABLE public.plan_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'To Do',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plan_tasks_priority_check CHECK (priority IN ('High', 'Medium', 'Low')),
  CONSTRAINT plan_tasks_status_check CHECK (status IN ('To Do', 'In Progress', 'Done')),
  CONSTRAINT plan_tasks_plan_owner_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES public.plans(id, user_id) ON DELETE CASCADE
);

CREATE INDEX plan_tasks_plan_id_idx ON public.plan_tasks(plan_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_tasks TO authenticated;
GRANT ALL ON public.plan_tasks TO service_role;

ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_tasks_select_own" ON public.plan_tasks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "plan_tasks_insert_own" ON public.plan_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_tasks.plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_tasks_update_own" ON public.plan_tasks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_tasks.plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_tasks_delete_own" ON public.plan_tasks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());