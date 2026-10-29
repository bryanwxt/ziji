# Beta reports setup

The app queues reports on the device (`src/report/outbox.ts`) and sends them once the build knows where to.

1. Create a Supabase project (region: Southeast Asia, Singapore).
2. SQL Editor → run [`supabase.sql`](supabase.sql).
3. Project Settings → API: copy the **Project URL** and the **publishable** (or legacy `anon`) key. Both are public by design;
   the table's policy only lets them insert.
4. GitHub → bryanwxt/ziji → Settings → Secrets and variables → Actions → **Variables**: add `REPORT_URL` and `REPORT_KEY`.
5. Re-run the Deploy workflow. Reports queued on iPads since this build go on their next launch.

Reading them: Supabase → Table Editor → `reports`, or SQL, e.g.

```sql
select received, kind, platform, version, body from reports where kind = 'mistake' order by received desc;
select device, count(*) filter (where kind = 'lesson') as lessons, max(received) as last_seen from reports group by device;
```

Free projects pause after about a week with no requests; restore from the dashboard (data is kept). Reports wait on the
iPads meanwhile.
