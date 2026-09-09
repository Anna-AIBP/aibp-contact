# aibp-contact

Digital contact cards for the AIBP team. One page per person at
`contact.aibp.sg/<slug>`, driven by the roster Google Sheet.

## How it works

The roster sheet is the single source of truth. Every deploy reads it, builds a
page per published person, and generates that person's `.vcf` and QR code on
demand. Nobody edits this repo to change a phone number.

```
Google Sheet ──> lib/sheet.js ──> /[slug]        the card
                                  /[slug]/vcard  the .vcf download
                                  /[slug]/qr     the QR code (SVG / PNG)
```

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

Copy `.env.example` to `.env.local`. With no credentials set, the site serves
`data/fixture.json` so `npm run dev` works on a fresh clone.

| Variable | Where it comes from |
|---|---|
| `GOOGLE_SHEET_ID` | The sheet URL. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` in the service account JSON. |
| `GOOGLE_PRIVATE_KEY` | `private_key` in the same file, quoted, `\n` sequences left as-is. |
| `NEXT_PUBLIC_SITE_URL` | `https://contact.aibp.sg` |

The service account needs **Viewer** access on the sheet — share it with the
service account email like any other collaborator.

## Sync

Two layers, deliberately:

1. **ISR revalidation, hourly.** The site self-heals even if everything else fails.
2. **Apps Script deploy hook** (`scripts/sync-trigger.gs`) for near-instant
   updates on edit, debounced so a person filling in a row doesn't fire twenty
   deploys.

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
