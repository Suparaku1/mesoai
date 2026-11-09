# Database and account review

## Verified
- The three designated accounts exist, are confirmed, have profiles and the expected teacher/admin, student and parent roles.
- The student address ends in `.com`; no `.con` duplicate was created.
- All three accounts passed password sign-in through the real login page and reached their dashboards without Google.
- The parent portal displayed the approved linked child; the approved request and reviewer match the existing relationship.
- Public application tables have row-level security enabled. Existing audit triggers remain enabled across 29 tables plus parent requests.
- Tutor reservation/completion and parent request/overview functions retain their intended execution restrictions.
- No accounts are missing profiles or roles.

## Repairs
- Updated passwords via the Auth admin API, without storing passwords in application files or changing roles/relationships.
- Added admin-only read policies for profiles and roles; previously an admin without a teacher role could not list all accounts.
- Added the missing profile audit trigger.
- Made SQL primary-role ordering deterministic and made role-query errors explicit instead of silently returning no roles.

## Limits and remaining review
- Chat history describes intended changes, not a complete record of manual database edits. No evidence proves which existing issues were introduced manually.
- Historical changes not captured by existing audit records cannot be reconstructed, and profile auditing begins with this repair.
- School-wide exam, schedule, library and announcement read rules were retained because earlier history explicitly kept shared school resources visible to signed-in users.
- The signup trigger still accepts the selected teacher role; changing teacher registration to approval would change the original requested workflow and needs a separate decision.
- The follow-up deep scan identified outbound messaging abuse, student-controlled insert values, formula injection in CSV exports and shared Calendar access. Confirmed paths were repaired; remaining findings have not been dismissed as clean.

## Follow-up verification and repairs
- Gmail profile read succeeded; the platform's sendMail delivered one audit email to the connected account, Gmail search found it, and its successful log row appeared in the UI.
- Calendar created and read back an event with Tirana offsets, then deleted only that temporary test event. Deadline synchronization with real future homework/exams was not exercised because no dated rows were available.
- Tutor streaming returned HTTP 200. A sparse 100-list IVFFlat index caused empty RAG results despite 15 existing chunks; exact ranking over RLS-visible candidates repaired retrieval. The UI showed six course sources, retained after reload, with no browser errors.
- Added staff authorization to shared Gmail/Calendar and manual automation endpoints. Student course notifications validate their own persisted enrollment and topic activity; homework grade notices read stored grades rather than caller values.
- Unknown Gmail/Calendar create outcomes are not blindly replayed. Failed-email retries use a conditional claim and reject Calendar/unknown rows. Calendar sync uses deterministic event IDs and checks mapping persistence.
- CSV exports neutralize spreadsheet formulas. Student inserts cannot self-approve enrollment or attach homework grades; quiz insert scores are recomputed and semester/final exams require a homework grade of at least 5.
- Knowledge indexing replaces chunks transactionally only after embedding succeeds; generated course content replacement is atomic and archives old topics instead of deleting student-linked records.
- No orphan enrollments, out-of-range quiz grades or unapproved parent links were found. Earlier actions without audit history cannot be reconstructed or attributed to manual edits.
- Remaining limits: full PDF regeneration, floating Tutor history trust, sequential topic enforcement and all notification replay/deduplication paths are not verified by this pass.