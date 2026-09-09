# aibp-contact

Digital contact cards for the AIBP team. One page per person at
`contact.aibp.sg/<slug>`, driven by the roster Google Sheet.

## How it works

The roster sheet is the single source of truth. Every deploy reads it, builds a
page per published person, and generates that person's `.vcf` and QR code on
demand. Nobody edits this repo to change a phone number.

```
Google Sheet
   │  Apps Script Web App (scripts/roster-webapp.gs) serves the rows as JSON
   ▼
lib/sheet.js ──> /[slug]        the card
                 /[slug]/vcard  the .vcf download
                 /[slug]/qr     the QR code (SVG / PNG)
```

There is no service account and no Google Cloud project. The Apps Script runs
as the sheet owner, so the sheet needs no extra sharing — which also means
there is nothing for a Workspace admin policy to block.

## Sheet contract

| Column | Field | Notes |
|---|---|---|
| A | `Include?` | **Only `Y` publishes.** Anything else — `VERIFY`, blank — stays dark. |
| B | `Slug` | Optional override. Leave blank and it derives from the email. |
| D | `Display Name` | Falls back to First + Last. |
| E / F | First / Last name | Used for the vCard `N:` field. |
| G | `Job Title` | |
| H | `Team` | Shown in the meta line, and as the vCard org unit. |
| I | `Email` | Also the slug source. |
| J | `Mobile` | Drives the tap-to-call row and the WhatsApp button. |
| K | `Office Phone` | |
| L | `LinkedIn URL` | Button appears only when filled. |
| M | `Based In` | Selects the market accent colour. |
| Q | `Photo` | Full image URL (Squarespace CDN). |
| R | `Office Address` | Per person — Singapore HQ is not assumed. |

Headers are matched loosely, so `Job Title (FILL)` and `Based In (verify)` both
work. Adding or reordering columns is safe as long as the header text still
starts with the same word.

## Slugs are permanent

Once a QR carrying `/<slug>` is printed on a name card, that URL has to keep
resolving to the same person forever. So:

- Column B, once set, is authoritative and never recalculated.
- A blank column B derives from the email local part — unique by definition,
  and stable when someone's name is re-recorded.
- **Two rows resolving to the same slug fail the build**, by design. A deploy
  that fails is recoverable; a printed QR pointing at the wrong colleague is not.

Adding a row with an email and `Y` in column A creates a live page. No other step.

## Environment

Copy `.env.example` to `.env.local`. With neither `ROSTER_API_*` variable set,
the site serves `data/fixture.json`, so a fresh clone runs with no setup.

| Variable | Where it comes from |
|---|---|
| `ROSTER_API_URL` | The Apps Script Web App `/exec` URL. |
| `ROSTER_API_TOKEN` | Must match the `ROSTER_API_TOKEN` script property on that project. |
| `NEXT_PUBLIC_SITE_URL` | `https://contact.aibp.sg` |

Full setup instructions live in the header comment of `scripts/roster-webapp.gs`.

## Sync

Pages revalidate every 60 seconds, so a sheet edit appears within a minute
without anyone deploying anything. `dynamicParams` is on, so a person added to
the sheet after the last build resolves on first request rather than 404ing.

If you ever need it truly instant, lower `revalidate` in `app/[slug]/page.js`
or add a Vercel deploy hook fired from an on-edit Apps Script trigger. Neither
is necessary at this roster size.

### A note on failure modes

Apps Script cannot set an HTTP status code — a web app always returns 200, even
when it refuses you. So errors travel in the response body and `lib/sheet.js`
checks for an `error` key. Without that check, a wrong token would look like a
successful response containing no people, and the site would quietly publish an
empty roster instead of failing the build.

### If the Web App URL leaks

Change `ROSTER_API_TOKEN` in Script Properties. The old URL stops working
immediately. Update the same value in Vercel and redeploy.

## QR codes

- `/<slug>/qr` — SVG, for print. Vector, so it scales to any card size.
- `/<slug>/qr?format=png&size=600` — PNG, for email signatures.

Error correction level M with a 2-module quiet zone. Test every QR after the
first print run — scanners are unforgiving about trimmed quiet zones.

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000/aizat — the fixture includes a few sample
people, one of them marked `VERIFY` so you can confirm gating works (it 404s).
