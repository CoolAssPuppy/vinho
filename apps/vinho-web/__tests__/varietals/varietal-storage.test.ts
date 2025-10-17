import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

describe('Grape Varietal Database Storage', () => {
  let testUserId: string;
  let testProducerId: string;
  let testWineId: string;
  let testVintageId: string;

  beforeAll(async () => {
    // Create test user
    const { data: authData } = await supabase.auth.signUp({
      email: `test-storage-${Date.now()}@example.com`,
      password: 'TestStorage123!'
    });
    testUserId = authData?.user?.id || '';
  });

  afterAll(async () => {
    // Cleanup test data in reverse order of creation
    if (testVintageId) {
      await supabase.from('wine_varietals').delete().eq('vintage_id', testVintageId);
      await supabase.from('vintages').delete().eq('id', testVintageId);
    }
    if (testWineId) {
      await supabase.from('wines').delete().eq('id', testWineId);
    }
    if (testProducerId) {
      await supabase.from('producers').delete().eq('id', testProducerId);
    }
    if (testUserId) {
      await supabase.auth.signOut();
    }
  });

  it('should have grape_varietals table with common varietals', async () => {
    const { data: varietals, error } = await supabase
      .from('grape_varietals')
      .select('name')
      .in('name', ['Pinot Noir', 'Chardonnay', 'Cabernet Sauvignon', 'Nebbiolo'])
      .limit(10);

    expect(error).toBeNull();
    expect(varietals).toBeDefined();
    expect(varietals!.length).toBeGreaterThan(0);

    // Check that we have at least some common varietals
    const varietalNames = varietals?.map(v => v.name) || [];
    const hasCommonVarietals = ['Pinot Noir', 'Chardonnay', 'Cabernet Sauvignon', 'Nebbiolo']
      .some(v => varietalNames.includes(v));

    if (!hasCommonVarietals) {
      console.warn('Common grape varietals not found in database. May need to seed data.');
    }
  });

  it('should store wine-varietal associations', async () => {
    // Create test producer
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .insert({
        name: `Test Producer ${Date.now()}`,
        created_by: testUserId
      })
      .select()
      .single();

    expect(producerError).toBeNull();
    expect(producer).toBeDefined();
    testProducerId = producer!.id;

    // Create test wine
    const { data: wine, error: wineError } = await supabase
      .from('wines')
      .insert({
        name: 'Test Champagne',
        producer_id: testProducerId,
        created_by: testUserId
      })
      .select()
      .single();

    expect(wineError).toBeNull();
    expect(wine).toBeDefined();
    testWineId = wine!.id;

    // Create test vintage
    const { data: vintage, error: vintageError } = await supabase
      .from('vintages')
      .insert({
        wine_id: testWineId,
        year: 2020,
        created_by: testUserId
      })
      .select()
      .single();

    expect(vintageError).toBeNull();
    expect(vintage).toBeDefined();
    testVintageId = vintage!.id;

    // Get or create test varietals
    const varietalNames = ['Test Pinot Noir', 'Test Chardonnay'];
    const varietalIds: string[] = [];

    for (const name of varietalNames) {
      // Try to get existing varietal
      let { data: varietal } = await supabase
        .from('grape_varietals')
        .select('id')
        .eq('name', name)
        .single();

      // If it doesn't exist, create it
      if (!varietal) {
        const { data: newVarietal, error: createError } = await supabase
          .from('grape_varietals')
          .insert({ name })
          .select()
          .single();

        if (createError) {
          console.error(`Failed to create varietal ${name}:`, createError);
          continue;
        }
        varietal = newVarietal;
      }

      if (varietal) {
        varietalIds.push(varietal.id);
      }
    }

    expect(varietalIds.length).toBe(2);

    // Create wine-varietal associations
    const associations = varietalIds.map(varietal_id => ({
      vintage_id: testVintageId,
      varietal_id
    }));

    const { error: assocError } = await supabase
      .from('wine_varietals')
      .insert(associations);

    expect(assocError).toBeNull();

    // Verify associations were created
    const { data: savedAssociations, error: fetchError } = await supabase
      .from('wine_varietals')
      .select(`
        varietal:grape_varietals(name)
      `)
      .eq('vintage_id', testVintageId);

    expect(fetchError).toBeNull();
    expect(savedAssociations).toBeDefined();
    expect(savedAssociations!.length).toBe(2);

    const savedNames = savedAssociations?.map((a: { varietal: { name: string } }) => a.varietal.name) || [];
    expect(savedNames).toContain('Test Pinot Noir');
    expect(savedNames).toContain('Test Chardonnay');
  });

  it('should prevent duplicate wine-varietal associations', async () => {
    // This test assumes we have testVintageId from the previous test
    if (!testVintageId) {
      console.warn('Skipping duplicate test - no vintage created');
      return;
    }

    // Get first varietal
    const { data: varietal } = await supabase
      .from('grape_varietals')
      .select('id')
      .limit(1)
      .single();

    if (!varietal) {
      console.warn('No varietals found for duplicate test');
      return;
    }

    // Try to insert the same association twice
    const association = {
      vintage_id: testVintageId,
      varietal_id: varietal.id
    };

    // First insert should work
    await supabase.from('wine_varietals').insert(association);

    // Second insert should fail due to unique constraint
    const { error: dupError } = await supabase
      .from('wine_varietals')
      .insert(association);

    expect(dupError).toBeDefined();
    expect(dupError?.code).toBe('23505'); // PostgreSQL unique violation code
  });

  it('should handle wines_added_queue processed_data with varietals', async () => {
    // Create a test wine_added entry with processed data
    const processedData = {
      producer: 'Dom Pérignon',
      wine_name: 'Dom Pérignon',
      year: 2015,
      varietals: ['Pinot Noir', 'Chardonnay'],
      region: 'Champagne',
      country: 'France'
    };

    const { data: wineAdded, error } = await supabase
      .from('wines_added_queue')
      .insert({
        user_id: testUserId,
        image_url: 'https://example.com/test.jpg',
        status: 'completed',
        processed_data: processedData
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(wineAdded).toBeDefined();
    expect(wineAdded!.processed_data).toBeDefined();
    expect(wineAdded!.processed_data.varietals).toEqual(['Pinot Noir', 'Chardonnay']);

    // Clean up
    if (wineAdded) {
      await supabase.from('wines_added_queue').delete().eq('id', wineAdded.id);
    }
  });
});