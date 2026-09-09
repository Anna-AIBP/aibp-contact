/**
 * AIBP contact cards — roster API
 *
 * Serves the roster sheet AND the Logos tab as JSON to contact.aibp.sg. The
 * script runs as you, so the sheet needs no extra sharing and no service
 * account exists to be blocked by Workspace policy.
 *
 * ── Setup ────────────────────────────────────────────────────────────────
 *  1. In the roster sheet: Extensions > Apps Script. Paste this file in,
 *     replacing anything already there. Save.
 *
 *  2. Project Settings (gear icon) > Script Properties > Add script property:
 *       ROSTER_API_TOKEN = <a long random string you invent>
 *     This is the only thing standing between the URL and your team's mobile
 *     numbers, so make it long and don't reuse a password.
 *
 *  3. Deploy > New deployment > gear icon > Web app.
 *       Execute as:     Me
 *       Who has access: Anyone
 *     "Anyone" is required: Vercel calls this from a server, with no Google
 *     login to present. The token is what actually gates access.
 *
 *  4. In Vercel > Settings > Environment Variables:
 *       ROSTER_API_URL   = the /exec URL from step 3
 *       ROSTER_API_TOKEN = the same token from step 2
 *     Redeploy.
 *
 * ── Updating this script later ───────────────────────────────────────────
 *  Paste the new code, save, then Deploy > Manage deployments > edit (pencil)
 *  > Version: New version > Deploy. The /exec URL stays the same, so nothing
 *  in Vercel needs changing.
 *
 * ── If the URL ever leaks ────────────────────────────────────────────────
 *  Change ROSTER_API_TOKEN in Script Properties. The old URL stops working
 *  immediately. Then update Vercel and redeploy.
 */

var LOGOS_TAB = 'Logos';

function doGet(e) {
  var token = PropertiesService.getScriptProperties().getProperty('ROSTER_API_TOKEN');

  if (!token) {
    return json_({ error: 'ROSTER_API_TOKEN script property is not set' });
  }

  var given = (e && e.parameter && e.parameter.token) || '';
  if (given !== token) {
    return json_({ error: 'unauthorized' });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // The roster is always the first tab.
  var roster = ss.getSheets()[0].getDataRange().getDisplayValues();

  // The Logos tab is optional — a missing tab returns an empty list rather
  // than an error, so the site keeps working if it is renamed or removed.
  var logosSheet = ss.getSheetByName(LOGOS_TAB);
  var logos = logosSheet ? logosSheet.getDataRange().getDisplayValues() : [];

  return json_({
    values: roster,
    logos: logos,
    generatedAt: new Date().toISOString(),
  });
}

/**
 * Apps Script web apps always return HTTP 200 — ContentService cannot set a
 * status code. Errors therefore travel in the body, and the site checks for
 * an `error` key rather than trusting the status.
 */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
