# Portfolio — notes for updates

Single-file static site (`index.html`), deployed by Netlify from `main`. No build step.

- Editable content lives at the top of the `<script>` in `index.html`: `SITE`, `PROJECTS` (public list fields only), `PROCESS`, `WHY`, `TESTIMONIALS`, `FAQ`.
- Full case-study details are **encrypted** in `CASES_LOCKED` (AES-GCM, PBKDF2) and unlock in the browser with a password.
  The password is **not** stored in this repo — ask Purushotham for it.
- To edit case studies:
  1. `node tools/lock.mjs decrypt <password>` → writes `private/cases.json`
  2. edit `private/cases.json` (keyed by project `slug`)
  3. `node tools/lock.mjs encrypt <password>` → re-locks into `index.html`
- Exception: projects with `open: true` (currently Monnai) are public by request — their case content lives in plain text in `CASES_OPEN` in `index.html`, not in `private/cases.json`.
- Never commit `private/` (it is git-ignored) and never put case-study details in plain text in `index.html` — the repo is public.
- Images placed in the repo are public; only text inside `CASES_LOCKED` is protected.
