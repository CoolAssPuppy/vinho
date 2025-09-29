#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from web app
dotenv.config({ path: path.resolve(__dirname, '../apps/vinho-web/.env.local') });

// Your actual Vivino migration stats from the database
const sampleStats = {
  totalWines: 1179,
  successfulImports: 1179,
  failedImports: 0,
  producers: 712,
  regions: 270,
  countries: 16,
  oldestVintage: 1967,
  newestVintage: 2023,
  topVarietal: "Various",
  averageRating: "4.2",
};

// Email HTML template (copied from templates.ts)
function getMigrationCompleteEmail({ stats, journalUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f6f6f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <tr>
            <td style="background: #ffffff; padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #B91C3C; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Vinho</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Your Tasting Journal is Ready! 🎉</h2>

              <p style="color: #525252; font-size: 16px; line-height: 24px; margin-bottom: 20px;">
                Fantastic news! We've successfully imported and enhanced your wine collection.
                Your ${stats.successfulImports} wines are now enriched with detailed information and ready to explore.
              </p>

              <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin-top: 30px; margin-bottom: 20px;">Your Collection Overview</h3>

              <table style="width: 100%; border-spacing: 10px;">
                <tr>
                  <td style="background-color: #FEF2F2; border-radius: 8px; padding: 20px; text-align: center; width: 50%;">
                    <div style="font-size: 32px; font-weight: 700; color: #B91C3C; margin-bottom: 5px;">${stats.successfulImports}</div>
                    <div style="font-size: 13px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Wines Imported</div>
                  </td>
                  <td style="background-color: #FEF2F2; border-radius: 8px; padding: 20px; text-align: center; width: 50%;">
                    <div style="font-size: 32px; font-weight: 700; color: #B91C3C; margin-bottom: 5px;">${stats.producers}</div>
                    <div style="font-size: 13px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Producers</div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #FEF2F2; border-radius: 8px; padding: 20px; text-align: center; width: 50%;">
                    <div style="font-size: 32px; font-weight: 700; color: #B91C3C; margin-bottom: 5px;">${stats.regions}</div>
                    <div style="font-size: 13px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Wine Regions</div>
                  </td>
                  <td style="background-color: #FEF2F2; border-radius: 8px; padding: 20px; text-align: center; width: 50%;">
                    <div style="font-size: 32px; font-weight: 700; color: #B91C3C; margin-bottom: 5px;">${stats.countries}</div>
                    <div style="font-size: 13px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Countries</div>
                  </td>
                </tr>
              </table>

              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin-top: 20px;">
                <p style="color: #1a1a1a; font-size: 15px; margin-bottom: 10px;"><strong>📊 Collection Highlights:</strong></p>
                <ul style="color: #525252; font-size: 14px; line-height: 24px; padding-left: 20px; margin: 10px 0 0 0;">
                  <li>Vintage range: ${stats.oldestVintage} - ${stats.newestVintage}</li>
                  <li>Most collected varietal: ${stats.topVarietal}</li>
                  <li>Average rating: ${stats.averageRating}/5 stars</li>
                </ul>
              </div>

              <p style="color: #525252; font-size: 16px; line-height: 24px; margin: 30px 0 20px;">
                Every wine has been enhanced with AI-powered insights including tasting notes, food pairings, and precise winery locations.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="${journalUrl}" style="background-color: #B91C3C; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">Explore Your Wine Journal</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 30px 40px; border-top: 1px solid #e5e5e5;">
              <p style="color: #737373; font-size: 13px; line-height: 20px; text-align: center; margin: 0;">
                © 2025 Vinho. Your wine journey, beautifully organized.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendTestEmail() {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Vinho <noreply@vinho.app>';
  const TEST_EMAIL = process.env.TEST_EMAIL || 'prashant_sridharan@hotmail.com';

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set in environment variables');
    console.log('\nPlease set the following in your .env.local file:');
    console.log('RESEND_API_KEY=your_resend_api_key');
    console.log('RESEND_FROM_EMAIL=Vinho <noreply@vinho.app>');
    console.log('TEST_EMAIL=your-email@example.com');
    process.exit(1);
  }

  console.log('📧 Sending test email...');
  console.log(`From: ${RESEND_FROM_EMAIL}`);
  console.log(`To: ${TEST_EMAIL}`);
  console.log('');

  const emailHtml = getMigrationCompleteEmail({
    stats: sampleStats,
    journalUrl: 'https://vinho.app/journal',
  });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: TEST_EMAIL,
        subject: '🎉 Your Tasting Journal is Ready! (Test Email)',
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to send email:');
      console.error('Status:', response.status);
      console.error('Error:', error);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Email sent successfully!');
    console.log('Email ID:', data.id);
    console.log('');
    console.log('📊 Test stats included in email:');
    console.log('  • Wines imported:', sampleStats.successfulImports);
    console.log('  • Producers:', sampleStats.producers);
    console.log('  • Regions:', sampleStats.regions);
    console.log('  • Countries:', sampleStats.countries);
    console.log('  • Vintage range:', `${sampleStats.oldestVintage}-${sampleStats.newestVintage}`);
    console.log('  • Top varietal:', sampleStats.topVarietal);
    console.log('  • Average rating:', `${sampleStats.averageRating}/5`);

  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

// Run the test
sendTestEmail();