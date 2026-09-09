/**
 * AIBP contact cards — roster API
 *
 * Serves the roster sheet as JSON to contact.aibp.sg. The script runs as you,
 * so the sheet needs no extra sharing and no service account exists to be
 * blocked by Workspace policy.
 *
 * ── Setup ────────────────────────────────────────────────────────────────
 *  1. In the roster sheet: Extensions > Apps Script. Paste this file in,
 *     replacing anything already there. Save.
 *
 *  2. Project Settings (gear icon) > Script Properties > Add script property:
 *       ROSTER_API_TOKEN = <a long random string you invent>
 *     Generate one however you like — 32+ characters, letters and digits.
 *     This is the only thing standing between the URL and your team's mobile
 *     numbers, so make it long and don't reuse a password.
 *
 *  3. Deploy > New deployment > gear icon > Web app.
 *       Description:      roster-api
 *       Execute as:       Me
 *       Who has access:   Anyone
 *     Deploy. Google asks you to authorise the script once — that is expected.
 *     Copy the Web app URL (it ends in /exec).
 *
 *     "Anyone" is required: Vercel calls this from a server, with no Google
 *     login to present. The token is what actually gates access.
 *
 *  4. In Vercel > Settings > Environment Variables:
 *       ROSTER_API_URL   = the /exec URL from step 3
 *       ROSTER_API_TOKEN = the same token from step 2
 *     Redeploy.
 *
 * ── Changing the token later ─────────────────────────────────────────────
 *  Update it in both places (Script Properties and Vercel), then redeploy the
 *  Vercel project. No need to redeploy the Apps Script.
 *
 * ── If the URL ever leaks ────────────────────────────────────────────────
 *  Change ROSTER_API_TOKEN in Script Properties. The old URL stops working
 *  immediately. Then update Vercel and redeploy.
 */

function doGet(e) {
  var token = PropertiesService.getScriptProperties().getProperty('ROSTER_API_TOKEN');

  if (!token) {
    return json_({ error: 'ROSTER_API_TOKEN script property is not set' });
  }

  var given = (e && e.parameter && e.parameter.token) || '';
  if (given !== token) {
    return json_({ error: 'unauthorized' });
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var values = sheet.getDataRange().getDisplayValues();

  return json_({
    values: values,
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
