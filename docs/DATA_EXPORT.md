# Vinho Data Export Documentation

## Overview

Users have complete control and portability of their data. Vinho supports multiple export formats for different use cases, from simple spreadsheets to full database dumps. All exports respect user privacy and include only the requesting user's data.

## Export Formats

### CSV Export

Human-readable spreadsheet format for tastings and wine data.

#### File Structure

```
tastings_export_2024-01-15.csv
```

#### Columns

```csv
tasting_id,wine_name,producer_name,vintage_year,verdict,rating,notes,tasted_at,location_lat,location_lon,varietal,region,country,soil_type,climate_zone
"uuid","Pinot Noir Reserve","Example Winery",2019,"liked",null,"Excellent balance","2024-01-15",45.5152,-122.6784,"Pinot Noir","Willamette Valley","USA","Volcanic","Csb"
```

#### Fields

- `tasting_id`: Unique identifier
- `wine_name`: Full wine name
- `producer_name`: Winery/producer
- `vintage_year`: Year (null for NV wines)
- `verdict`: liked/disliked
- `rating`: Future feature placeholder
- `notes`: Tasting notes
- `tasted_at`: Date of tasting
- `location_lat`: Latitude where tasted
- `location_lon`: Longitude where tasted
- `varietal`: Primary grape varietal
- `region`: Wine region
- `country`: Country of origin
- `soil_type`: Vineyard soil type
- `climate_zone`: Köppen climate classification

### GeoJSON Export

Geographic data format for mapping applications.

#### File Structure

```
wine_journey_2024-01-15.geojson
```

#### Format

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "exported_at": "2024-01-15T10:30:00Z",
    "user_id": "uuid",
    "total_tastings": 127,
    "date_range": {
      "start": "2023-01-01",
      "end": "2024-01-15"
    }
  },
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.6784, 45.5152]
      },
      "properties": {
        "id": "uuid",
        "wine_name": "Pinot Noir Reserve",
        "producer_name": "Example Winery",
        "vintage_year": 2019,
        "verdict": "liked",
        "tasted_at": "2024-01-15",
        "notes": "Excellent balance",
        "varietal": "Pinot Noir",
        "region": "Willamette Valley",
        "country": "USA",
        "soil_type": "Volcanic",
        "climate_zone": "Csb",
        "vineyard_geometry": {
          "type": "Polygon",
          "coordinates": [[...]]
        }
      }
    }
  ]
}
```

#### Use Cases

- Import into QGIS, ArcGIS, or other GIS software
- Display on custom web maps
- Spatial analysis of tasting patterns
- Share journey visualizations

### Full JSON Export

Complete data dump including all relationships.

#### File Structure

```
vinho_full_export_2024-01-15.json
```

#### Schema

```json
{
  "export_version": "1.0",
  "exported_at": "2024-01-15T10:30:00Z",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2023-01-01T00:00:00Z",
    "preferences": {
      "favorite_varietals": ["Pinot Noir", "Chardonnay"],
      "favorite_soils": ["Volcanic", "Limestone"],
      "favorite_climates": ["Csb", "Csa"],
      "price_range": {
        "min": 20,
        "max": 150
      }
    }
  },
  "tastings": [
    {
      "id": "uuid",
      "vintage": {
        "id": "uuid",
        "year": 2019,
        "wine": {
          "id": "uuid",
          "name": "Pinot Noir Reserve",
          "producer": {
            "id": "uuid",
            "name": "Example Winery",
            "website": "https://example-winery.com",
            "location": {
              "type": "Point",
              "coordinates": [-122.6784, 45.5152]
            }
          }
        },
        "vineyard": {
          "id": "uuid",
          "name": "Estate Vineyard",
          "block_name": "Block A",
          "geometry": {
            "type": "Polygon",
            "coordinates": [[...]]
          },
          "soil_type": "Volcanic",
          "climate_zone": "Csb"
        },
        "varietals": [
          {
            "name": "Pinot Noir",
            "percentage": 100
          }
        ],
        "abv": 13.5
      },
      "verdict": "liked",
      "notes": "Excellent balance",
      "tasted_at": "2024-01-15T18:30:00Z",
      "created_at": "2024-01-15T19:00:00Z",
      "photos": [
        {
          "id": "uuid",
          "url": "https://storage.vinho.app/photos/...",
          "thumbnail_url": "https://storage.vinho.app/thumbnails/...",
          "created_at": "2024-01-15T18:35:00Z"
        }
      ]
    }
  ],
  "scans": [
    {
      "id": "uuid",
      "image_url": "https://storage.vinho.app/scans/...",
      "ocr_text": "2019 Pinot Noir Reserve\nExample Winery\nWillamette Valley",
      "matched_vintage_id": "uuid",
      "created_at": "2024-01-15T18:25:00Z"
    }
  ],
  "restaurant_favorites": [
    {
      "id": "uuid",
      "restaurant_name": "The Wine Bar",
      "url": "https://thewinebar.com",
      "created_at": "2024-01-01T20:00:00Z"
    }
  ],
  "statistics": {
    "total_tastings": 127,
    "liked_count": 89,
    "disliked_count": 38,
    "unique_wines": 115,
    "unique_producers": 67,
    "countries_visited": 12,
    "most_tasted_varietal": "Pinot Noir",
    "most_liked_region": "Burgundy",
    "average_vintage_year": 2018
  }
}
```

## Export Process

### Web Application

#### UI Flow

1. Navigate to Settings > Data & Privacy
2. Select "Export My Data"
3. Choose format (CSV, GeoJSON, JSON)
4. Optional: Include photos
5. Click "Generate Export"
6. Download starts automatically

#### Implementation

```typescript
// Server action
export async function exportUserData(input: {
  format: "csv" | "geojson" | "json";
  includePhotos?: boolean;
}) {
  // Validate user session
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");

  // Generate export based on format
  const exportData = await generateExport(user.id, input.format);

  // Store in temporary storage
  const { url, expiresAt } = await storeExport(exportData);

  return {
    downloadUrl: url,
    expiresAt,
    filename: `vinho_export_${format}_${date}.${ext}`,
  };
}
```

### iOS Application

#### UI Flow

1. Open Settings tab
2. Tap "Export Data"
3. Select format from action sheet
4. Choose sharing method (Files, AirDrop, Email)
5. Export generated and shared

#### Implementation

```swift
func exportData(format: ExportFormat) async throws -> URL {
    let data = try await supabaseService.exportUserData(format: format)
    let fileURL = try await writeToTemporaryFile(data, format: format)
    return fileURL
}

func shareExport(url: URL) {
    let activityVC = UIActivityViewController(
        activityItems: [url],
        applicationActivities: nil
    )
    present(activityVC, animated: true)
}
```

## Photo Export

### Options

- **Include in JSON**: Photos embedded as URLs
- **Separate archive**: ZIP file with photos + metadata
- **Skip photos**: Faster export, smaller file size

### Photo Archive Structure

```
vinho_photos_2024-01-15.zip
├── metadata.json
├── photos/
│   ├── 2024-01-15_uuid_original.jpg
│   ├── 2024-01-15_uuid_thumbnail.jpg
│   └── ...
└── README.txt
```

### Metadata Format

```json
{
  "photos": [
    {
      "filename": "2024-01-15_uuid_original.jpg",
      "tasting_id": "uuid",
      "wine_name": "Pinot Noir Reserve",
      "taken_at": "2024-01-15T18:35:00Z",
      "location": {
        "latitude": 45.5152,
        "longitude": -122.6784
      }
    }
  ]
}
```

## Privacy Considerations

### Data Included

- All user-created content (tastings, notes, photos)
- Matched wine and producer information
- Geographic coordinates
- Preferences and settings
- Usage statistics

### Data Excluded

- Other users' data
- Internal system IDs (except UUIDs)
- Authentication tokens
- Payment information
- Analytics/telemetry data

### Data Retention

- Exports available for 24 hours
- Automatic cleanup of temporary files
- No server-side export history kept
- User can regenerate anytime

## Import Functionality

### CSV Import

```typescript
// Parse and validate CSV
export async function importTastings(file: File) {
  const csv = await parseCSV(file);
  const validated = validateTastingRecords(csv);

  // Match wines to database
  const matched = await matchWines(validated);

  // Import with deduplication
  const results = await importWithDedup(matched);

  return {
    imported: results.imported,
    skipped: results.skipped,
    errors: results.errors,
  };
}
```

### Deduplication Logic

- Check for existing tastings by date + wine
- Skip exact duplicates
- Merge notes if different
- Preserve original timestamps

## Compliance

### GDPR Compliance

- Export within 30 days (immediate in practice)
- Machine-readable format
- Complete data portability
- Clear documentation

### Data Deletion

Companion to export for complete data control:

```typescript
export async function deleteAllUserData() {
  // Export backup first
  const backup = await exportUserData({ format: "json" });

  // Delete in reverse dependency order
  await deletePhotos(userId);
  await deleteTastings(userId);
  await deleteScans(userId);
  await deletePreferences(userId);

  // Finally delete account
  await deleteAccount(userId);

  return {
    backupUrl: backup.downloadUrl,
    deletedAt: new Date(),
  };
}
```

## API Limits

### Export Limits

- Maximum 5 exports per hour
- Export expires after 24 hours
- Maximum file size: 500MB (including photos)

### Performance

- CSV: ~1000 tastings per second
- GeoJSON: ~500 features per second
- JSON: ~100 full records per second
- Photos: Parallel download, 10 concurrent

## Error Handling

### Common Errors

```typescript
export enum ExportError {
  RATE_LIMITED = "EXPORT_RATE_LIMITED",
  TOO_LARGE = "EXPORT_TOO_LARGE",
  INVALID_FORMAT = "EXPORT_INVALID_FORMAT",
  PHOTOS_UNAVAILABLE = "PHOTOS_UNAVAILABLE",
}
```

### User Messaging

- "Export in progress..." with progress bar
- "Export ready!" with download button
- "Export failed: [specific reason]" with retry
- Email notification for large exports

## Testing

### Test Scenarios

1. Empty account export
2. Large dataset (10,000+ tastings)
3. Export with missing photos
4. Concurrent export requests
5. Import of own export
6. Import with conflicts

### Validation

```typescript
// Validate export completeness
export function validateExport(exportData: any, userId: string) {
  assert(exportData.user.id === userId);
  assert(exportData.tastings.every((t) => t.user_id === userId));
  assert(exportData.export_version === CURRENT_VERSION);
  assert(new Date(exportData.exported_at).isValid());
}
```
