#!/usr/bin/env node

/**
 * Test Suite for Grape Varietal Extraction
 * Tests the edge function's ability to extract and enrich grape varietals
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test wines with known varietals
const TEST_WINES = [
  {
    name: 'Dom Pérignon 2015',
    producer: 'Dom Pérignon',
    year: 2015,
    region: 'Champagne',
    country: 'France',
    expectedVarietals: ['Pinot Noir', 'Chardonnay'],
    imageUrl: 'https://example.com/dom-perignon-2015.jpg', // Would need real image
  },
  {
    name: 'Opus One 2019',
    producer: 'Opus One',
    year: 2019,
    region: 'Napa Valley',
    country: 'USA',
    expectedVarietals: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc', 'Petit Verdot', 'Malbec'],
    imageUrl: 'https://example.com/opus-one-2019.jpg',
  },
  {
    name: 'Sassicaia 2018',
    producer: 'Tenuta San Guido',
    year: 2018,
    region: 'Tuscany',
    country: 'Italy',
    expectedVarietals: ['Cabernet Sauvignon', 'Cabernet Franc'],
    imageUrl: 'https://example.com/sassicaia-2018.jpg',
  },
  {
    name: 'Barolo Brunate 2017',
    producer: 'Roberto Voerzio',
    year: 2017,
    region: 'Piedmont',
    country: 'Italy',
    expectedVarietals: ['Nebbiolo'],
    imageUrl: 'https://example.com/barolo-brunate-2017.jpg',
  },
  {
    name: 'Chablis Premier Cru 2020',
    producer: 'William Fèvre',
    year: 2020,
    region: 'Burgundy',
    country: 'France',
    expectedVarietals: ['Chardonnay'],
    imageUrl: 'https://example.com/chablis-2020.jpg',
  },
];

export async function testVarietalExtraction() {
  console.log('🍷 Starting Grape Varietal Extraction Tests\n');

  const results = {
    passed: 0,
    failed: 0,
    details: [] as any[],
  };

  for (const testWine of TEST_WINES) {
    console.log(`\nTesting: ${testWine.name}`);
    console.log('Expected varietals:', testWine.expectedVarietals.join(', '));

    try {
      // Create a test user first
      const testEmail = `test-varietal-${Date.now()}@example.com`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestVarietal123!'
      });

      if (authError || !authData.user) {
        console.error('❌ Failed to create test user:', authError);
        results.failed++;
        continue;
      }

      // Create a test entry in wines_added
      const { data: wineAdded, error: insertError } = await supabase
        .from('wines_added')
        .insert({
          user_id: authData.user.id,
          image_url: testWine.imageUrl,
          status: 'pending',
          ocr_text: `${testWine.producer} ${testWine.name}`, // Simulated OCR
          retry_count: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to insert test wine:', insertError);
        results.failed++;
        continue;
      }

      console.log('✅ Created test entry:', wineAdded.id);

      // Trigger the processing edge function using supabase client
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'process-wine-queue',
        { body: {} }
      );

      if (functionError) {
        console.error('❌ Edge function failed:', functionError);
        results.failed++;
        continue;
      }

      console.log('✅ Edge function invoked successfully');


      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check the results
      const { data: processed, error: fetchError } = await supabase
        .from('wines_added')
        .select('processed_data, status')
        .eq('id', wineAdded.id)
        .single();

      if (fetchError || !processed) {
        console.error('❌ Failed to fetch processed data:', fetchError);
        results.failed++;
        continue;
      }

      if (processed.status !== 'completed') {
        console.error('❌ Processing not completed. Status:', processed.status);
        results.failed++;
        continue;
      }

      const extractedVarietals = processed.processed_data?.varietals || [];
      console.log('Extracted varietals:', extractedVarietals.join(', ') || 'none');

      // Check if varietals match
      const varietalsMatch = testWine.expectedVarietals.every(expected =>
        extractedVarietals.some((extracted: string) =>
          extracted.toLowerCase().includes(expected.toLowerCase())
        )
      );

      if (varietalsMatch && extractedVarietals.length > 0) {
        console.log('✅ Varietals extracted correctly!');
        results.passed++;
      } else {
        console.log('❌ Varietal extraction mismatch');
        console.log('  Expected:', testWine.expectedVarietals);
        console.log('  Got:', extractedVarietals);
        results.failed++;
      }

      // Check if varietals were saved to grape_varietals and wine_varietals
      const { data: vintage } = await supabase
        .from('vintages')
        .select(`
          id,
          wine:wines!inner(
            name,
            producer:producers!inner(name)
          )
        `)
        .eq('wine.producer.name', testWine.producer)
        .eq('year', testWine.year)
        .single();

      if (vintage) {
        const { data: savedVarietals } = await supabase
          .from('wine_varietals')
          .select(`
            varietal:grape_varietals!inner(name)
          `)
          .eq('vintage_id', vintage.id);

        const savedVarietalNames = savedVarietals?.map((v: any) => v.varietal.name) || [];
        console.log('Saved in database:', savedVarietalNames.join(', ') || 'none');

        if (savedVarietalNames.length > 0) {
          console.log('✅ Varietals saved to database');
        } else {
          console.log('⚠️  Varietals not saved to database');
        }
      }

      results.details.push({
        wine: testWine.name,
        expected: testWine.expectedVarietals,
        extracted: extractedVarietals,
        success: varietalsMatch && extractedVarietals.length > 0,
      });

      // Clean up test data
      await supabase.from('wines_added').delete().eq('id', wineAdded.id);
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});

    } catch (error) {
      console.error('❌ Test error:', error);
      results.failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / TEST_WINES.length) * 100).toFixed(1)}%`);

  console.log('\nDetailed Results:');
  results.details.forEach(detail => {
    const icon = detail.success ? '✅' : '❌';
    console.log(`${icon} ${detail.wine}`);
    console.log(`   Expected: ${detail.expected.join(', ')}`);
    console.log(`   Extracted: ${detail.extracted.join(', ') || 'none'}`);
  });

  return results;
}

// Run tests
testVarietalExtraction()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });

export { testVarietalExtraction, TEST_WINES };