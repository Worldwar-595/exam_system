const axios = require('axios');

/**
 * Third-party API integration: QR Code Generator API (api.qrserver.com).
 * No API key required. Generates a QR code image encoding the exam slip
 * details (student, course, date, time, venue) so it can be scanned at
 * the exam hall entrance for quick verification.
 *
 * Docs: https://goqr.me/api/doc/create-qr-code/
 */
async function generateExamSlipQrCode({ studentName, courseCode, examDate, startTime, venue }) {
  const payload = `EXAM SLIP | ${studentName} | ${courseCode} | ${examDate} ${startTime} | ${venue}`;
  const encoded = encodeURIComponent(payload);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encoded}`;

  // Verify the third-party service responds (evidence for report/testing).
  const response = await axios.get(qrImageUrl, { responseType: 'arraybuffer', timeout: 8000 });

  return {
    qr_image_url: qrImageUrl,
    content_type: response.headers['content-type'],
    payload_encoded: payload,
  };
}

module.exports = { generateExamSlipQrCode };
