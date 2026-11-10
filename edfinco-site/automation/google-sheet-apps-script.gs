/**
 * EdFinco → Google Sheet bridge.
 *
 * Paste this whole file into your Google Sheet: Extensions → Apps Script (replace the sample code),
 * set SECRET below, save, then Deploy → New deployment → Web app (Execute as: Me, Who has access:
 * Anyone) and copy the Web app URL. Full steps: docs/blog-automation-setup.md → "Google Sheet".
 *
 * The website sends one change at a time: {secret, action: "upsert"|"delete", tab, ref, row}.
 *   upsert → updates the row with that Reference in the tab (or adds it)
 *   delete → removes that Reference from both tabs (a student asked for their data to be erased)
 * Tabs "Submitted" and "Partial" are created automatically with a header row.
 *
 * @OnlyCurrentDoc  (Google only asks for access to THIS spreadsheet, not all of your Sheets)
 */

// Must be exactly the same long random value as SHEETS_WEBHOOK_SECRET in the website settings.
const SECRET = "PASTE-YOUR-SHEETS_WEBHOOK_SECRET-HERE";

const HEADERS = [
  "Reference",
  "Received (IST)",
  "Stage",
  "Status",
  "Assigned to",
  "Student name",
  "Email",
  "Phone",
  "Destination",
  "Study level",
  "Intake",
  "Co-borrower",
  "Message",
  "Consent",
  "Completed (IST)",
  "Last updated (IST)",
];
const TABS = ["Submitted", "Partial"];

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: "Bad request" });
  }
  if (!body || typeof body.secret !== "string" || SECRET.indexOf("PASTE-") === 0 || body.secret !== SECRET) {
    return reply({ ok: false, error: "Unauthorized" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // one change at a time, so rows never clash
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (body.action === "upsert" && TABS.indexOf(body.tab) !== -1 && body.row && body.row.Reference) {
      const sheet = getTab(ss, body.tab);
      const values = HEADERS.map(function (h) {
        return asText(body.row[h]);
      });
      const at = findRow(sheet, body.row.Reference) || sheet.getLastRow() + 1;
      sheet.getRange(at, 1, 1, HEADERS.length).setValues([values]);
      return reply({ ok: true });
    }

    if (body.action === "delete" && typeof body.ref === "string" && body.ref) {
      TABS.forEach(function (name) {
        const sheet = ss.getSheetByName(name);
        if (!sheet) return;
        let at = findRow(sheet, body.ref);
        while (at) {
          sheet.deleteRow(at);
          at = findRow(sheet, body.ref);
        }
      });
      return reply({ ok: true });
    }

    return reply({ ok: false, error: "Unknown action" });
  } finally {
    lock.releaseLock();
  }
}

function getTab(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRow(sheet, ref) {
  if (sheet.getLastRow() < 2) return 0;
  const found = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(ref))
    .matchEntireCell(true)
    .findNext();
  return found ? found.getRow() : 0;
}

// Every value is stored as plain text: a leading apostrophe tells Google Sheets "this is text"
// (it isn't shown in the cell). So nothing can run as a formula (=, +, -, @), phone numbers keep
// their + and spaces, and dates stay exactly as written.
function asText(v) {
  if (v === undefined || v === null || v === "") return "";
  return "'" + String(v);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
