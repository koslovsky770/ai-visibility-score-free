/**
 * Google Apps Script web app that receives leads from lib/leads.ts
 * (sendToGoogleSheets) and appends them as rows to the sheet it's bound to.
 * Setup: see README.md in this folder.
 *
 * SECRET must match GOOGLE_SHEETS_WEBHOOK_SECRET in Vercel exactly.
 */
const SECRET = "PASTE_THE_SAME_SECRET_AS_IN_VERCEL";
const SHEET_NAME = "לידים";

const COLUMNS = [
  ["createdAt", "תאריך"],
  ["name", "שם"],
  ["email", "אימייל"],
  ["submittedUrl", "אתר שהוזן"],
  ["analyzedUrl", "אתר שנבדק בפועל"],
  ["score", "ציון"],
  ["tierLabel", "דירוג"],
  ["marketingConsent", "הסכמה לדיוור"],
  ["businessWhat", "מה העסק עושה (לפי ה-AI)"],
  ["topGaps", "מה צריך לתקן"],
  ["cached", "מהקאש"],
  ["estimatedCostUsd", "עלות משוערת ($)"],
  ["scoreBand", "רמת ציון"],
];

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: "invalid json" });
  }
  if (data.secret !== SECRET) {
    return json({ ok: false, error: "unauthorized" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet();
    const row = COLUMNS.map(([key]) => {
      const v = data[key];
      if (key === "createdAt" && v) return new Date(v);
      if (key === "marketingConsent" || key === "cached") return v ? "כן" : "לא";
      // Prevent formula injection from visitor-supplied text.
      if (typeof v === "string" && /^[=+\-@]/.test(v)) return "'" + v;
      return v === undefined || v === null ? "" : v;
    });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.setRightToLeft(true);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(([, header]) => header));
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
