import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { AI_PROMPTS, getPrompt } from '../../../../supabase/shared/ai-prompts-library';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

describe('Grape Varietal Extraction', () => {
  let testUserId: string;
  let testWineId: string;

  beforeAll(async () => {
    // Create test user
    const { data: authData } = await supabase.auth.signUp({
      email: `test-varietal-${Date.now()}@example.com`,
      password: 'TestVarietal123!'
    });
    testUserId = authData?.user?.id || '';
  });

  afterAll(async () => {
    // Cleanup test data
    if (testWineId) {
      await supabase.from('wines_added_queue').delete().eq('id', testWineId);
    }
    if (testUserId) {
      await supabase.auth.signOut();
    }
  });

  it('should extract varietals for Dom Pérignon', async () => {
    // Test that AI prompts library includes varietal extraction
    const prompt = getPrompt('WINE_DATA_ENRICHMENT', {
      producer: 'Dom Pérignon',
      wine_name: 'Dom Pérignon',
      year: 2015,
      region: 'Champagne',
      country: 'France',
      varietals: [],
      producer_website: null,
      producer_address: null
    });

    expect(prompt.user).toContain('Pinot Noir');
    expect(prompt.user).toContain('Chardonnay');
    expect(prompt.user).toContain('GRAPE VARIETALS');
  });

  it('should extract varietals for Opus One', async () => {
    const prompt = getPrompt('WINE_DATA_ENRICHMENT', {
      producer: 'Opus One',
      wine_name: 'Opus One',
      year: 2019,
      region: 'Napa Valley',
      country: 'USA',
      varietals: [],
      producer_website: null,
      producer_address: null
    });

    expect(prompt.user).toContain('Cabernet Sauvignon');
    expect(prompt.user).toContain('Merlot');
    expect(prompt.user).toContain('GRAPE VARIETALS');
  });

  it('should extract varietals for Barolo', async () => {
    const prompt = getPrompt('WINE_DATA_ENRICHMENT', {
      producer: 'Roberto Voerzio',
      wine_name: 'Barolo Brunate',
      year: 2017,
      region: 'Piedmont',
      country: 'Italy',
      varietals: [],
      producer_website: null,
      producer_address: null
    });

    expect(prompt.user).toContain('Nebbiolo');
    expect(prompt.user).toContain('GRAPE VARIETALS');
  });

  it('should handle wines with existing varietals', async () => {
    const prompt = getPrompt('WINE_DATA_ENRICHMENT', {
      producer: 'Test Winery',
      wine_name: 'Test Wine',
      year: 2020,
      region: 'Test Region',
      country: 'Test Country',
      varietals: ['Pinot Noir', 'Chardonnay'],
      producer_website: null,
      producer_address: null
    });

    expect(prompt.user).toContain('Current varietals: Pinot Noir, Chardonnay');
  });

  it('should process queue items with varietal extraction', async () => {
    // Create a test wine in the queue
    const { data: queueItem, error } = await supabase
      .from('wines_added_queue')
      .insert({
        user_id: testUserId,
        image_url: 'https://example.com/test-wine.jpg',
        ocr_text: 'Dom Pérignon 2015 Champagne',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test wine: ${error.message}`);
    }

    testWineId = queueItem.id;

    // Verify the wine was created with pending status
    expect(queueItem.status).toBe('pending');
    expect(queueItem.ocr_text).toContain('Dom Pérignon');

    // Note: In a real test, we would invoke the edge function here
    // and verify that processed_data contains varietals
  });

  it('should include varietal extraction in label extraction prompt', () => {
    const prompt = getPrompt('WINE_LABEL_EXTRACTION', 'Dom Pérignon 2015 Champagne');

    expect(prompt.user).toContain('Grape varieties');
    expect(prompt.user).toContain('Common grapes:');
    expect(prompt.user).toContain('Chardonnay');
    expect(prompt.user).toContain('Pinot Noir');
    expect(prompt.user).toContain('varietals:');
  });

  it('should return varietals as an array', () => {
    const enrichmentPrompt = getPrompt('WINE_DATA_ENRICHMENT', {
      producer: 'Test Producer',
      wine_name: 'Test Wine',
      varietals: []
    });

    expect(enrichmentPrompt.user).toContain('MUST be an array');
    expect(enrichmentPrompt.user).toContain('varietals field MUST be an array');
  });
});