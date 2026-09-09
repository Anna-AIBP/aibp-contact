/**
 * AIBP contact cards — instant sync from the roster sheet.
 *
 * Without this, edits appear within the hour via ISR revalidation. With it,
 * they appear in about a minute.
 *
 * Setup:
 *  1. Vercel > Project > Settings > Git > Deploy Hooks. Create one named
 *     "roster-sync" on the main branch. Copy the URL.
 *  2. In the roster sheet: Extensions > Apps Script. Paste this file.
 *  3. Project Settings > Script Properties: add DEPLOY_HOOK_URL = that URL.
 *  4. Triggers > Add Trigger > onRosterEdit > From spreadsheet > On edit.
 *
 * The deploy hook URL is a secret — anyone holding it can trigger deploys.
 * Keep it in Script Properties, never pasted inline below.
 */

function onRosterEdit(e) {
  // Debounce: a person filling in a row fires many edits in a row. Only
  // redeploy if nothing has fired in the last two minutes.
  var props = PropertiesService.getScriptProperties();
  var hook = props.getProperty('DEPLOY_HOOK_URL');
  if (!hook) {
    console.error('DEPLOY_HOOK_URL script property is not set.');
    return;
  }

  var now = Date.now();
  var last = Number(props.getProperty('LAST_DEPLOY_MS') || 0);
  if (now - last < 2 * 60 * 1000) {
    props.setProperty('PENDING', 'true');
    return;
  }

  triggerDeploy_(hook, props, now);
}

/** Optional: add a time-driven trigger every 5 minutes to flush debounced edits. */
function flushPendingDeploy() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('PENDING') !== 'true') return;
  var hook = props.getProperty('DEPLOY_HOOK_URL');
  if (hook) triggerDeploy_(hook, props, Date.now());
}

function triggerDeploy_(hook, props, now) {
  try {
    UrlFetchApp.fetch(hook, { method: 'post', muteHttpExceptions: true });
    props.setProperty('LAST_DEPLOY_MS', String(now));
    props.deleteProperty('PENDING');
    console.log('Deploy triggered.');
  } catch (err) {
    console.error('Deploy hook failed: ' + err);
  }
}
