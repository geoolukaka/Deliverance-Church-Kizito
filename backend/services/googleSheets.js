/**
 * Optional Google Sheets logging.
 * Used as a simple, human-friendly backup/reporting layer alongside MySQL —
 * e.g. finance volunteers can open a live spreadsheet of donations and
 * contact messages without needing database access.
 *
 * Setup:
 *  1. Create a Google Cloud project -> enable the "Google Sheets API".
 *  2. Create a Service Account -> generate a JSON key.
 *  3. Share your target Google Sheet with the service account's email
 *     (found in the JSON key as "client_email") with Editor access.
 *  4. Set GOOGLE_SHEETS_ENABLED=true and fill in GOOGLE_SHEET_ID,
 *     GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY in .env
 *
 * If disabled or misconfigured, all functions here fail silently (logged
 * to console only) so the core API never breaks because of Sheets.
 */
const { google } = require('googleapis');
require('dotenv').config();

function isEnabled() {
  return process.env.GOOGLE_SHEETS_ENABLED === 'true'
    && process.env.GOOGLE_SHEET_ID
    && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    && process.env.GOOGLE_PRIVATE_KEY;
}

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

async function appendRow(sheetName, values) {
  if (!isEnabled()) return;
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW', // RAW = text only; USER_ENTERED would let a donor's name run as a spreadsheet formula
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] },
    });
  } catch (err) {
    console.error('[googleSheets] append failed:', err.message);
  }
}

/** Log a donation row: Date, Donor, Email, Phone, Fund, Amount (KES), Method, Status, Receipt */
function logDonation(donation) {
  return appendRow('Donations', [
    new Date().toISOString(),
    donation.donorName,
    donation.donorEmail || '',
    donation.donorPhone || '',
    donation.fund,
    donation.amount,
    'KES',
    donation.paymentMethod,
    donation.status,
    donation.mpesaReceiptNumber || '',
  ]);
}

/** Log a contact form submission */
function logContactMessage(msg) {
  return appendRow('Contact Messages', [
    new Date().toISOString(),
    msg.name,
    msg.email,
    msg.phone || '',
    msg.subject,
    msg.message,
  ]);
}

module.exports = { isEnabled, appendRow, logDonation, logContactMessage };
