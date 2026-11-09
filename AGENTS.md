<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Tutor history uses authenticated per-user database threads with route-derived IDs and persisted UIMessage parts, so reloads restore isolated conversations.
- Tutor requests reserve an atomic daily quota shared by streaming and floating entry points; only server-authorized completion persists assistant messages.
- Source citations are returned from RLS-scoped course chunks with real topic links, never inferred from model output.
- Parent approval is an atomic database operation that alone creates a parent link; academic overviews use a narrow authenticated RPC returning only linked children's academic fields, never private messages or quiz answers.
- Role reads fail explicitly on database errors; SQL and client primary-role selection share deterministic teacher/admin/parent/student priority to preserve multi-role dashboards.
- Shared Gmail/Calendar endpoints require staff authorization; student notifications are limited to persisted own-course events, and ambiguous outbound writes are not replayed automatically.
- Course knowledge replacement is a service-only transactional RPC after all embeddings succeed, so indexing failures preserve the previous index.
- Calendar deadline synchronization uses stable source-derived event IDs and checks mapping writes to prevent duplicates after retries or concurrent sync.
- Quiz inserts compute scores from stored questions and enforce approved enrollment and homework exam eligibility; generated course replacement archives old topics atomically to retain student records.
- Course vector retrieval materializes RLS-visible candidates before exact distance ranking to avoid sparse IVFFlat recall failures on small course indexes.
