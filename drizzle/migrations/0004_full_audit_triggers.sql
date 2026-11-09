ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS module text;
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_module_idx ON public.audit_log (module);

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  v_old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  v_row jsonb := COALESCE(v_new, v_old);
  v_changes jsonb := '{}'::jsonb;
  v_label text;
  k text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF k NOT IN ('updated_at','embedding') AND (v_new->k) IS DISTINCT FROM (v_old->k) THEN
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object(
          'from', left(COALESCE(v_old->>k,''), 200),
          'to', left(COALESCE(v_new->>k,''), 200)));
      END IF;
    END LOOP;
    IF v_changes = '{}'::jsonb THEN RETURN NEW; END IF;
  END IF;

  v_label := COALESCE(v_row->>'title', v_row->>'name', v_row->>'subject', v_row->>'number',
    v_row->>'supplier', v_row->>'category', v_row->>'description',
    NULLIF(trim(COALESCE(v_row->>'first_name','') || ' ' || COALESCE(v_row->>'last_name','')), ''),
    v_row->>'status', v_row->>'role');

  INSERT INTO public.audit_log(user_id, action, entity, entity_id, module, metadata)
  VALUES (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    v_row->>'id',
    TG_ARGV[0],
    jsonb_strip_nulls(jsonb_build_object(
      'label', left(v_label, 200),
      'changes', CASE WHEN TG_OP = 'UPDATE' THEN v_changes END,
      'grade', COALESCE(v_row->'grade', v_row->'final_grade'),
      'status', v_row->>'status'
    ))
  );
  RETURN COALESCE(NEW, OLD);
END $$;

REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('user_roles','admin'),('parent_links','admin'),('announcements','admin'),
    ('crm_contacts','crm'),('crm_leads','crm'),('crm_tickets','crm'),('crm_communications','crm'),('crm_pipeline_stages','crm'),('automation_rules','crm'),
    ('inventory_items','erp'),('stock_movements','erp'),('budgets','erp'),('purchase_orders','erp'),('purchase_order_items','erp'),('invoices','erp'),('payments','erp'),
    ('courses','courses'),('topics','courses'),('quizzes','courses'),('quiz_questions','courses'),('enrollments','courses'),('exams','courses'),('schedule','courses'),('attendance','courses'),('library_resources','courses'),
    ('homework','homework'),('homework_submissions','homework'),
    ('course_homework_grades','grades'),('quiz_attempts','grades')
  ) AS t(tbl, module)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit ON public.%I', r.tbl);
    EXECUTE format('CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change(%L)', r.tbl, r.module);
  END LOOP;
END $$;