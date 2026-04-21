# Svasamm CRM — Playwright snapshot tests

Coverage for the Sprint 4 branding layer: document title, navbar logo,
AGPL footer, and two page-level screenshots (dashboard + leads list).

## How baselines are captured

The initial snapshot baselines for `frontend/e2e/snapshots/` are captured
by CI (see `.github/workflows/e2e.yml` — wired in Task 1.9), not
locally. CI builds a fresh bench site with the Svasamm CRM fork
installed, runs the test suite with `--update-snapshots`, and
commits the resulting `snapshots/` directory back to the branch.

Running locally against the dev server is possible but requires
installing the Svasamm CRM fork onto a running bench site first
(the fork is not the same installation as upstream `apps/crm/`).

## Running locally (after the fork is installed on a bench site)

```bash
cd /Users/mithunkumarsingh/Projects/local-frappe-bench/apps/svasamm_crm_fork
BENCH_URL=http://<your-site>:8000 \
  TEST_USER=<svasamm-user> \
  TEST_USER_PWD=<password> \
  npx --prefix frontend playwright test
```

To refresh baselines intentionally (after a brand change):

```bash
npx --prefix frontend playwright test --update-snapshots
```

Snapshot drift threshold: 5% pixel-diff tolerance for page-level
captures, strict text assertions for title/footer/logo.

## Adding new tests

Snapshots land in `frontend/e2e/snapshots/`. Keep them small — each test
ideally asserts one brand element so a diff surfaces the specific
regression.
