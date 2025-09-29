// Email templates for Vinho transactional emails

export interface MigrationStartedEmailProps {
  wineCount: number;
  journalUrl: string;
}

export function getMigrationStartedEmail({
  wineCount,
  journalUrl,
}: MigrationStartedEmailProps): string {
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
              <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Your Vivino Import Has Started! 🚀</h2>
              <p style="color: #525252; font-size: 16px; line-height: 24px; margin-bottom: 20px;">
                Great news! We've started importing your wine collection from Vivino.
                We're processing <strong>${wineCount} wines</strong> and enriching them with:
              </p>
              <div style="background-color: #FEF2F2; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <ul style="color: #525252; font-size: 15px; line-height: 28px; padding-left: 20px; margin: 0;">
                  <li>🌍 Precise winery locations and coordinates</li>
                  <li>🍇 Complete varietal information</li>
                  <li>📍 Detailed region and appellation data</li>
                  <li>🔬 Alcohol content (ABV) details</li>
                  <li>🍽️ Food pairing suggestions</li>
                  <li>📝 AI-generated tasting notes</li>
                </ul>
              </div>
              <p style="color: #525252; font-size: 16px; line-height: 24px; margin-bottom: 30px;">
                This process typically takes 10-30 minutes. You don't need to wait—your wines are already available!
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="${journalUrl}" style="background-color: #B91C3C; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">View Your Wine Journal</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 30px 40px; border-top: 1px solid #e5e5e5;">
              <p style="color: #737373; font-size: 13px; line-height: 20px; text-align: center; margin: 0;">
                © 2025 Vinho. Making your wine journey seamless.
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

export interface MigrationCompleteEmailProps {
  stats: {
    totalWines: number;
    successfulImports: number;
    failedImports: number;
    producers: number;
    regions: number;
    countries: number;
    oldestVintage: number;
    newestVintage: number;
    topVarietal: string;
    averageRating: string;
  };
  journalUrl: string;
}

export function getMigrationCompleteEmail({
  stats,
  journalUrl,
}: MigrationCompleteEmailProps): string {
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

              <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin-top: 30px; margin-bottom: 20px;">Your Tasting Journal Overview</h3>

              <table style="width: 100%; border-spacing: 10px;">
                <tr>
                  <td style="background-color: #FEF2F2; border-radius: 8px; padding: 20px; text-align: center; width: 50%;">
                    <div style="font-size: 32px; font-weight: 700; color: #B91C3C; margin-bottom: 5px;">${stats.successfulImports}</div>
                    <div style="font-size: 13px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Wines Added</div>
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
                <p style="color: #1a1a1a; font-size: 15px; margin-bottom: 10px;"><strong>📊 Tasting Journal Highlights:</strong></p>
                <ul style="color: #525252; font-size: 14px; line-height: 24px; padding-left: 20px; margin: 10px 0 0 0;">
                  <li>Vintage range: ${stats.oldestVintage} - ${stats.newestVintage}</li>
                  <li>Most collected varietal: ${stats.topVarietal}</li>
                  <li>Average rating: ${stats.averageRating}/5 stars</li>
                </ul>
              </div>

              <p style="color: #525252; font-size: 16px; line-height: 24px; margin: 30px 0 20px;">
                We've attempted to enrich your wines with AI-powered insights including tasting notes, food pairings, and precise winery locations.
                Please feel free to add your own tasting notes, photos, and more to your wines.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="${journalUrl}" style="background-color: #B91C3C; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">Explore Your Tasting Journal</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 30px 40px; border-top: 1px solid #e5e5e5;">
              <p style="color: #737373; font-size: 13px; line-height: 20px; text-align: center; margin: 0;">
                © 2025 Vinho. Your wine tasting journey, beautifully organized.
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

export interface WineAddedEmailProps {
  wineDetails: {
    producer: string;
    wineName: string;
    vintage: number | null;
    region: string;
    country: string;
    varietals: string[];
    abv: number | null;
    imageUrl?: string;
    tastingNotes?: string;
    foodPairings?: string[];
    servingTemp?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    } | null;
  };
  wineUrl: string;
  journalUrl: string;
}

export function getWineAddedEmail({
  wineDetails,
  wineUrl,
  journalUrl,
}: WineAddedEmailProps): string {
  const vintageDisplay = wineDetails.vintage || "NV";

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
              <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Wine Successfully Added to Your Collection!</h2>

              <p style="color: #525252; font-size: 16px; line-height: 24px; margin-bottom: 30px;">
                Great choice! We've analyzed your wine and added it to your tasting journal with enriched details from our AI sommelier.
              </p>

              <!-- Wine Card -->
              <div style="background-color: #FEF2F2; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <p style="color: #737373; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 5px 0;">${wineDetails.producer}</p>
                <h3 style="color: #1a1a1a; font-size: 22px; font-weight: 600; margin: 0 0 5px 0;">${wineDetails.wineName}</h3>
                <p style="color: #B91C3C; font-size: 18px; font-weight: 500; margin: 0 0 15px 0;">${vintageDisplay}</p>

                <table style="width: 100%; margin-top: 15px;">
                  <tr>
                    <td style="color: #737373; font-size: 14px; padding-bottom: 8px; width: 100px;">Region:</td>
                    <td style="color: #1a1a1a; font-size: 14px; padding-bottom: 8px; font-weight: 500;">${wineDetails.region}, ${wineDetails.country}</td>
                  </tr>
                  ${
                    wineDetails.varietals.length > 0
                      ? `
                  <tr>
                    <td style="color: #737373; font-size: 14px; padding-bottom: 8px; width: 100px;">Varietals:</td>
                    <td style="color: #1a1a1a; font-size: 14px; padding-bottom: 8px; font-weight: 500;">${wineDetails.varietals.join(", ")}</td>
                  </tr>`
                      : ""
                  }
                  ${
                    wineDetails.abv
                      ? `
                  <tr>
                    <td style="color: #737373; font-size: 14px; padding-bottom: 8px; width: 100px;">Alcohol:</td>
                    <td style="color: #1a1a1a; font-size: 14px; padding-bottom: 8px; font-weight: 500;">${wineDetails.abv}% ABV</td>
                  </tr>`
                      : ""
                  }
                </table>
              </div>

              <!-- AI Analysis -->
              ${
                wineDetails.tastingNotes || wineDetails.foodPairings
                  ? `
              <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin-top: 30px; margin-bottom: 20px;">🤖 AI Sommelier Analysis</h3>

              ${
                wineDetails.tastingNotes
                  ? `
              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                <p style="color: #1a1a1a; font-size: 15px; font-weight: 600; margin-bottom: 10px;">Tasting Notes</p>
                <p style="color: #525252; font-size: 14px; line-height: 22px; margin: 0;">${wineDetails.tastingNotes}</p>
              </div>`
                  : ""
              }

              ${
                wineDetails.foodPairings && wineDetails.foodPairings.length > 0
                  ? `
              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                <p style="color: #1a1a1a; font-size: 15px; font-weight: 600; margin-bottom: 10px;">Perfect Pairings</p>
                <ul style="color: #525252; font-size: 14px; line-height: 22px; padding-left: 20px; margin: 10px 0 0 0;">
                  ${wineDetails.foodPairings.map((pairing) => `<li>${pairing}</li>`).join("")}
                </ul>
              </div>`
                  : ""
              }

              ${
                wineDetails.coordinates
                  ? `
              <div style="background-color: #E0F2FE; border: 1px solid #BAE6FD; border-radius: 6px; padding: 12px; margin-top: 15px;">
                <p style="color: #075985; font-size: 13px; margin: 0;">📍 We've pinpointed the exact winery location for you to explore on the map</p>
              </div>`
                  : ""
              }
              `
                  : ""
              }

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="${wineUrl}" style="background-color: #B91C3C; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">View Wine Details</a>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin-top: 30px; margin-bottom: 20px;">What's Next?</h3>

              <div style="margin-bottom: 25px;">
                <p style="color: #525252; font-size: 14px; line-height: 20px; margin-bottom: 12px;">✏️ <strong>Add tasting notes:</strong> Record your impressions when you taste this wine</p>
                <p style="color: #525252; font-size: 14px; line-height: 20px; margin-bottom: 12px;">⭐ <strong>Rate it:</strong> Give it a score to track your preferences</p>
                <p style="color: #525252; font-size: 14px; line-height: 20px; margin-bottom: 12px;">📸 <strong>Add photos:</strong> Capture moments with this wine</p>
                <p style="color: #525252; font-size: 14px; line-height: 20px; margin-bottom: 12px;">🔄 <strong>Find similar wines:</strong> Discover wines like this one</p>
              </div>

              <div style="background-color: #FEF2F2; border-radius: 8px; padding: 20px; text-align: center; margin-top: 25px;">
                <p style="color: #525252; font-size: 14px; line-height: 20px; margin-bottom: 20px;">
                  Keep building your tasting journal! Scan another label or explore wines similar to this one.
                </p>
                <a href="${journalUrl}" style="background-color: #ffffff; border: 2px solid #B91C3C; color: #B91C3C; padding: 10px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">Go to Wine Journal →</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 30px 40px; border-top: 1px solid #e5e5e5;">
              <p style="color: #737373; font-size: 13px; line-height: 20px; text-align: center; margin: 0 0 10px;">
                This wine was automatically analyzed and cataloged by Vinho AI.
              </p>
              <p style="color: #737373; font-size: 13px; line-height: 20px; text-align: center; margin: 0;">
                © 2025 Vinho. Building your perfect wine tasting journey.
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
