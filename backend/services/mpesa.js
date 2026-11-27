/**
 * M-Pesa Daraja API integration (Safaricom).
 * Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 *
 * Flow:
 *  1. getAccessToken() -> OAuth token via Consumer Key/Secret
 *  2. stkPush()        -> triggers the "Lipa na M-Pesa Online" STK prompt
 *                          on the donor's phone
 *  3. Safaricom calls MPESA_CALLBACK_URL with the result, handled in
 *     routes/donations.js -> handleMpesaCallback()
 */
const axios = require('axios').create({ timeout: 15000 }); // never hang on Safaricom
require('dotenv').config();

const BASE_URL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';

function getTimestamp() {
  // Daraja expects East Africa Time (UTC+3) regardless of where the server runs.
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
    pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds())
  );
}

async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');

  const { data } = await axios.get(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return data.access_token;
}

/**
 * Initiate an STK Push (Lipa Na M-Pesa Online) request.
 * @param {Object} params
 * @param {string} params.phone - MSISDN in format 2547XXXXXXXX
 * @param {number} params.amount - Amount in whole KES
 * @param {string} params.accountReference - Shown to the payer, e.g. "DCIKizito-Tithe"
 * @param {string} params.transactionDesc - Short description
 */
async function stkPush({ phone, amount, accountReference, transactionDesc }) {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = getTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  const accessToken = await getAccessToken();

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: (accountReference || process.env.MPESA_ACCOUNT_REFERENCE || 'DCIKizito').slice(0, 12),
    TransactionDesc: (transactionDesc || 'Church Giving').slice(0, 13),
  };

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );

  // data: { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage }
  return data;
}

/**
 * Parse the callback body Safaricom sends to MPESA_CALLBACK_URL.
 * Returns a normalized object regardless of success/failure.
 */
function parseCallback(body) {
  const stkCallback = body && body.Body && body.Body.stkCallback;
  if (!stkCallback) return null;

  const result = {
    merchantRequestId: stkCallback.MerchantRequestID,
    checkoutRequestId: stkCallback.CheckoutRequestID,
    resultCode: stkCallback.ResultCode,
    resultDesc: stkCallback.ResultDesc,
    success: stkCallback.ResultCode === 0,
    amount: null,
    mpesaReceiptNumber: null,
    phoneNumber: null,
    transactionDate: null,
  };

  if (result.success && stkCallback.CallbackMetadata && Array.isArray(stkCallback.CallbackMetadata.Item)) {
    for (const item of stkCallback.CallbackMetadata.Item) {
      if (item.Name === 'Amount') result.amount = item.Value;
      if (item.Name === 'MpesaReceiptNumber') result.mpesaReceiptNumber = item.Value;
      if (item.Name === 'PhoneNumber') result.phoneNumber = item.Value;
      if (item.Name === 'TransactionDate') result.transactionDate = item.Value;
    }
  }
  return result;
}

/** Ask Safaricom for the real status of an STK push (used if the callback is slow, or never arrives). */
async function stkQuery(checkoutRequestId) {
  const shortcode = process.env.MPESA_SHORTCODE;
  const timestamp = getTimestamp();
  const password = Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
  const accessToken = await getAccessToken();
  try {
    const { data } = await axios.post(
      `${BASE_URL}/mpesa/stkpushquery/v1/query`,
      { BusinessShortCode: shortcode, Password: password, Timestamp: timestamp, CheckoutRequestID: checkoutRequestId },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    const code = Number(data.ResultCode);
    if (Number.isNaN(code)) return { pending: true };
    return { pending: false, success: code === 0, resultCode: code, resultDesc: data.ResultDesc, receipt: null, amount: null };
  } catch (err) {
    const d = err.response && err.response.data;
    if (d && d.errorCode === '500.001.1001') return { pending: true }; // "transaction is being processed"
    throw err;
  }
}

/** Friendly, safe messages for Safaricom result codes (we never forward raw provider text to the browser). */
const RESULTS = {
  0: ['completed', 'Payment received. Thank you for giving!'],
  1: ['failed', 'Your M-Pesa balance was not enough for this payment. No money was taken.'],
  1001: ['failed', 'Another M-Pesa transaction was in progress on your phone. No money was taken.'],
  1019: ['failed', 'The M-Pesa request expired. No money was taken.'],
  1025: ['failed', 'We could not send the M-Pesa prompt to your phone. No money was taken.'],
  1032: ['cancelled', 'You cancelled the M-Pesa request, so no money was taken.'],
  1037: ['failed', 'The M-Pesa prompt was not approved in time. No money was taken.'],
  2001: ['failed', 'The M-Pesa PIN entered was wrong. No money was taken.'],
};
function describeResult(code) {
  const r = RESULTS[Number(code)];
  return r ? { status: r[0], message: r[1] } : { status: 'failed', message: 'The payment did not go through. No money was taken.' };
}

module.exports = { getAccessToken, stkPush, stkQuery, parseCallback, describeResult };
