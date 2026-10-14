CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  goal text NOT NULL,
  deadline date,
  deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_step text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plans_id_user_unique UNIQUE (id, user_id),
  CONSTRAINT plans_deliverables_array CHECK (jsonb_typeof(deliverables) = 'array')
);
CREATE INDEX plans_user_id_idx ON public.plans(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_select_own" ON public.plans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "plans_insert_own" ON public.plans FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "plans_update_own" ON public.plans FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "plans_delete_own" ON public.plans FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High','Medium','Low')),
  status text NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do','In Progress','Done')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_tasks_plan_owner_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES public.plans(id, user_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX plan_tasks_plan_id_idx ON public.plan_tasks(plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_tasks TO authenticated;
GRANT ALL ON public.plan_tasks TO service_role;
ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_select_own" ON public.plan_tasks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "tasks_insert_own" ON public.plan_tasks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));
CREATE POLICY "tasks_update_own" ON public.plan_tasks FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));
CREATE POLICY "tasks_delete_own" ON public.plan_tasks FOR DELETE TO authenticated USING (user_id = auth.uid());