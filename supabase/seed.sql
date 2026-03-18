SET search_path TO public, extensions, auth;

-- Test wines and tastings for integration testing
-- Self-contained: creates all needed reference data (regions, grape varietals, producers).
--
-- Adds 20 real wines with producers, vintages, tastings, scans, and a queue item.
-- All reference data inserts use conflict-safe patterns for idempotency.

-- ============================================================================
-- 1. Create test user
-- ============================================================================

DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert into auth.users if not already present
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = test_user_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      confirmation_token, recovery_token, reauthentication_token,
      email_change, email_change_token_new, email_change_token_current,
      phone, phone_change, phone_change_token,
      is_sso_user, is_anonymous,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      test_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'test@vinho.app',
      crypt('testpassword123', gen_salt('bf')),
      now(), now(), now(),
      '', '', '',
      '', '', '',
      '', '', '',
      false, false,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"first_name": "Test", "last_name": "Taster"}'::jsonb
    );
  END IF;

  -- Insert identity record (required for GoTrue password auth)
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = test_user_id AND provider = 'email') THEN
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      test_user_id, test_user_id, test_user_id::text, 'email',
      jsonb_build_object('sub', test_user_id::text, 'email', 'test@vinho.app', 'email_verified', true),
      now(), now(), now()
    );
  END IF;

  -- Insert profile
  INSERT INTO profiles (id, first_name, last_name, tasting_note_style, price_range)
  VALUES (
    test_user_id,
    'Test',
    'Taster',
    'casual',
    '{"low": 10, "high": 50}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ============================================================================
-- 2. Regions not already in 04_regions.sql
-- ============================================================================
-- Regions table has no unique index on name, so use WHERE NOT EXISTS.

INSERT INTO regions (name, country)
SELECT name, country FROM (VALUES
  ('Douro Valley', 'Portugal'),
  ('Bairrada', 'Portugal'),
  ('Alentejo', 'Portugal'),
  ('Dão', 'Portugal'),
  ('Lisboa', 'Portugal'),
  ('Burgenland', 'Austria'),
  ('Central Valley', 'Chile'),
  ('Chablis', 'France'),
  ('Côtes-du-Rhône', 'France'),
  ('Haut-Médoc', 'France'),
  ('Chianti Classico', 'Italy'),
  ('Sicily', 'Italy')
) AS new_regions(name, country)
WHERE NOT EXISTS (
  SELECT 1 FROM regions r WHERE lower(r.name) = lower(new_regions.name)
);

-- ============================================================================
-- 3. Grape varietals not already in 03_grape_varietals.sql
-- ============================================================================
-- grape_varietals has a unique index on lower(name).

INSERT INTO grape_varietals (name)
VALUES
  ('Baga'),
  ('Touriga Nacional'),
  ('Touriga Franca'),
  ('Tinta Roriz'),
  ('Blaufränkisch'),
  ('Zweigelt'),
  ('Nerello Mascalese'),
  ('Galego Dourado'),
  ('Castelão')
ON CONFLICT (lower(name::text)) DO NOTHING;

-- ============================================================================
-- 4. Producers
-- ============================================================================
-- producers has a unique index on lower(name).

INSERT INTO producers (name, city, region_id) VALUES
  ('Taylor Fladgate', 'Vila Nova de Gaia', (SELECT id FROM regions WHERE lower(name) = 'douro valley')),
  ('Kompassus', 'Anadia', (SELECT id FROM regions WHERE lower(name) = 'bairrada')),
  ('António Maçanita', 'Évora', (SELECT id FROM regions WHERE lower(name) = 'alentejo')),
  ('Rosi Schuster', 'Mönchhof', (SELECT id FROM regions WHERE lower(name) = 'burgenland')),
  ('Ampelia', 'Roccastrada', (SELECT id FROM regions WHERE lower(name) = 'tuscany')),
  ('Taboadella', 'Silvã de Cima', (SELECT id FROM regions WHERE lower(name) = 'dão')),
  ('Sidónio de Sousa', 'Anadia', (SELECT id FROM regions WHERE lower(name) = 'bairrada')),
  ('Avidagos', 'Avidagos', (SELECT id FROM regions WHERE lower(name) = 'douro valley')),
  ('Concha y Toro', 'Santiago', (SELECT id FROM regions WHERE lower(name) = 'central valley')),
  ('Drouhin Vaudon', 'Chablis', (SELECT id FROM regions WHERE lower(name) = 'chablis')),
  ('M. Chapoutier', 'Tain-l''Hermitage', (SELECT id FROM regions WHERE lower(name) = 'côtes-du-rhône')),
  ('Louis Jadot', 'Beaune', (SELECT id FROM regions WHERE lower(name) = 'burgundy')),
  ('Château Aney', 'Cussac-Fort-Médoc', (SELECT id FROM regions WHERE lower(name) = 'haut-médoc')),
  ('Antinori', 'Florence', (SELECT id FROM regions WHERE lower(name) = 'chianti classico')),
  ('Planeta', 'Menfi', (SELECT id FROM regions WHERE lower(name) = 'sicily')),
  ('Poeira', 'Provesende', (SELECT id FROM regions WHERE lower(name) = 'douro valley')),
  ('Terras de Tavares', 'Tavares', (SELECT id FROM regions WHERE lower(name) = 'dão')),
  ('Ramilo', 'Bucelas', (SELECT id FROM regions WHERE lower(name) = 'lisboa'))
ON CONFLICT (lower(name::text)) DO NOTHING;

-- ============================================================================
-- 5. Wines
-- ============================================================================
-- wines has a unique index on (producer_id, lower(name)).

INSERT INTO wines (name, producer_id, wine_type, is_nv, varietal) VALUES
  ('Chip Dry', (SELECT id FROM producers WHERE lower(name) = 'taylor fladgate'), 'fortified', true, 'White Port blend'),
  ('Baga', (SELECT id FROM producers WHERE lower(name) = 'kompassus'), 'red', true, 'Baga'),
  ('Fitapreta em Rosé', (SELECT id FROM producers WHERE lower(name) = 'antónio maçanita'), 'rosé', false, 'Touriga Nacional, Castelão'),
  ('Aus den Dörfern', (SELECT id FROM producers WHERE lower(name) = 'rosi schuster'), 'red', false, 'Blaufränkisch, Zweigelt'),
  ('Unlitro', (SELECT id FROM producers WHERE lower(name) = 'ampelia'), 'red', false, 'Sangiovese, Carignan'),
  ('Grande Villae', (SELECT id FROM producers WHERE lower(name) = 'taboadella'), 'red', false, 'Touriga Nacional, Tinta Roriz'),
  ('Reserva Tinto', (SELECT id FROM producers WHERE lower(name) = 'sidónio de sousa'), 'red', false, 'Baga'),
  ('Vinho Tinto', (SELECT id FROM producers WHERE lower(name) = 'avidagos'), 'red', false, 'Touriga Nacional, Touriga Franca'),
  ('Fitapreta', (SELECT id FROM producers WHERE lower(name) = 'antónio maçanita'), 'red', false, 'Touriga Nacional, Aragonez'),
  ('Casillero del Diablo', (SELECT id FROM producers WHERE lower(name) = 'concha y toro'), 'red', false, 'Cabernet Sauvignon'),
  ('Chablis Réserve de Vaudon', (SELECT id FROM producers WHERE lower(name) = 'drouhin vaudon'), 'white', false, 'Chardonnay'),
  ('Belleruche', (SELECT id FROM producers WHERE lower(name) = 'm. chapoutier'), 'red', false, 'Grenache, Syrah'),
  ('Bourgogne Gamay', (SELECT id FROM producers WHERE lower(name) = 'louis jadot'), 'red', false, 'Gamay'),
  ('Haut-Médoc', (SELECT id FROM producers WHERE lower(name) = 'château aney'), 'red', false, 'Cabernet Sauvignon, Merlot'),
  ('Badia a Passignano', (SELECT id FROM producers WHERE lower(name) = 'antinori'), 'red', false, 'Sangiovese'),
  ('Eruzione 1614', (SELECT id FROM producers WHERE lower(name) = 'planeta'), 'red', false, 'Nerello Mascalese'),
  ('Douro 44 Barricas', (SELECT id FROM producers WHERE lower(name) = 'poeira'), 'red', false, 'Touriga Nacional, Touriga Franca, Tinta Roriz'),
  ('Reserva', (SELECT id FROM producers WHERE lower(name) = 'terras de tavares'), 'red', false, 'Touriga Nacional'),
  ('Galego Dourado Branco', (SELECT id FROM producers WHERE lower(name) = 'ramilo'), 'white', false, 'Galego Dourado'),
  ('Baga Vinhas Velhas', (SELECT id FROM producers WHERE lower(name) = 'kompassus'), 'red', true, 'Baga')
ON CONFLICT (producer_id, lower(name::text)) DO NOTHING;

-- ============================================================================
-- 6. Vintages (where year is known)
-- ============================================================================
-- vintages has a unique constraint on (wine_id, year).
-- NV wines get a conventional year of 9999 to satisfy the constraint.

INSERT INTO vintages (wine_id, year, abv) VALUES
  -- Chip Dry (NV, fortified -- NULL year for non-vintage)
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'taylor fladgate' AND lower(w.name) = 'chip dry'), NULL, 20.0),
  -- Baga (NV)
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'kompassus' AND lower(w.name) = 'baga'), NULL, 13.0),
  -- Fitapreta em Rosé 2024
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'antónio maçanita' AND lower(w.name) = 'fitapreta em rosé'), 2024, 12.5),
  -- Aus den Dörfern 2021
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'rosi schuster' AND lower(w.name) = 'aus den dörfern'), 2021, 13.0),
  -- Unlitro 2023
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'ampelia' AND lower(w.name) = 'unlitro'), 2023, 12.5),
  -- Grande Villae 2022
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'taboadella' AND lower(w.name) = 'grande villae'), 2022, 14.0),
  -- Reserva Tinto 2019
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'sidónio de sousa' AND lower(w.name) = 'reserva tinto'), 2019, 13.5),
  -- Vinho Tinto 2022
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'avidagos' AND lower(w.name) = 'vinho tinto'), 2022, 13.0),
  -- Fitapreta 2023
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'antónio maçanita' AND lower(w.name) = 'fitapreta'), 2023, 14.0),
  -- Casillero del Diablo 2023
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'concha y toro' AND lower(w.name) = 'casillero del diablo'), 2023, 13.5),
  -- Chablis Réserve de Vaudon 2022
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'drouhin vaudon' AND lower(w.name) = 'chablis réserve de vaudon'), 2022, 12.5),
  -- Belleruche (NV-ish -- NULL year)
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'm. chapoutier' AND lower(w.name) = 'belleruche'), NULL, 14.0),
  -- Bourgogne Gamay (NV-ish -- NULL year)
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'louis jadot' AND lower(w.name) = 'bourgogne gamay'), NULL, 12.5),
  -- Haut-Médoc 2017
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'château aney' AND lower(w.name) = 'haut-médoc'), 2017, 13.0),
  -- Badia a Passignano 2021
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'antinori' AND lower(w.name) = 'badia a passignano'), 2021, 14.0),
  -- Eruzione 1614, 2019
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'planeta' AND lower(w.name) = 'eruzione 1614'), 2019, 14.5),
  -- Douro 44 Barricas 2014
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'poeira' AND lower(w.name) = 'douro 44 barricas'), 2014, 14.0),
  -- Reserva 2004
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'terras de tavares' AND lower(w.name) = 'reserva'), 2004, 13.5),
  -- Galego Dourado Branco 2024
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'ramilo' AND lower(w.name) = 'galego dourado branco'), 2024, 12.0),
  -- Baga Vinhas Velhas (NV -- NULL year)
  ((SELECT w.id FROM wines w JOIN producers p ON w.producer_id = p.id WHERE lower(p.name) = 'kompassus' AND lower(w.name) = 'baga vinhas velhas'), NULL, 13.5)
ON CONFLICT (wine_id, year) DO NOTHING;

-- ============================================================================
-- 7. Tastings for test user
-- ============================================================================

DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_id uuid;
BEGIN
  -- 1. Chip Dry - Taylor Fladgate
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'taylor fladgate' AND lower(w.name) = 'chip dry' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 3, 'Dry white port, interesting as an aperitif. Nutty and crisp.', '2025-12-01', 'Home', 'Lisbon');

  -- 2. Baga - Kompassus
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'kompassus' AND lower(w.name) = 'baga' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 4, 'High acidity, firm tannins, dark cherry and earthy notes. Classic Bairrada.', '2025-12-05', 'Wine Bar do Bairro', 'Lisbon');

  -- 3. Fitapreta em Rosé 2024
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'antónio maçanita' AND lower(w.name) = 'fitapreta em rosé' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 4, 'Pale salmon. Strawberry and watermelon on the nose. Dry and refreshing.', '2026-01-10', 'Cervejaria Ramiro', 'Lisbon');

  -- 4. Aus den Dörfern 2021
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'rosi schuster' AND lower(w.name) = 'aus den dörfern' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 5, 'Stunning Burgenland red. Spicy, mineral, with dark plum. Silky tannins.', '2026-01-15', 'Home', 'Vienna');

  -- 5. Unlitro 2023
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'ampelia' AND lower(w.name) = 'unlitro' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 3, 'Light and easy Tuscan table wine. Good value for a litre bottle.', '2026-01-20', 'Trattoria da Luigi', 'Florence');

  -- 6. Grande Villae 2022
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'taboadella' AND lower(w.name) = 'grande villae' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 4, 'Elegant Dão red. Violets, blackberry, and a long mineral finish.', '2026-02-01', 'Taberna da Rua das Flores', 'Lisbon');

  -- 7. Reserva Tinto 2019
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'sidónio de sousa' AND lower(w.name) = 'reserva tinto' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 4, 'Aged Baga with beautiful tertiary notes. Leather, tobacco, dried cherry.', '2026-02-05', 'Home', 'Lisbon');

  -- 8. Vinho Tinto 2022
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'avidagos' AND lower(w.name) = 'vinho tinto' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 2, 'Simple Douro table wine. A bit rough on the tannins, nothing special.', '2026-02-10', 'O Velho Eurico', 'Porto');

  -- 9. Fitapreta 2023
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'antónio maçanita' AND lower(w.name) = 'fitapreta' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 5, 'Bold Alentejo red. Ripe dark fruit, spice, and great structure. A favorite.', '2026-02-14', 'Ponto Final', 'Lisbon');

  -- 10. Casillero del Diablo 2023
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'concha y toro' AND lower(w.name) = 'casillero del diablo' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 2, 'Mass-market Chilean cab. Smooth but one-dimensional. Fine for a weeknight.', '2026-02-20', 'Home', 'Lisbon');

  -- 11. Chablis Réserve de Vaudon 2022
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'drouhin vaudon' AND lower(w.name) = 'chablis réserve de vaudon' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 5, 'Classic Chablis. Flinty minerality, green apple, and razor-sharp acidity.', '2026-02-25', 'Le Comptoir', 'Paris');

  -- 12. Belleruche - M. Chapoutier
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'm. chapoutier' AND lower(w.name) = 'belleruche' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 3, 'Solid Côtes-du-Rhône. Peppery, red fruit, medium body. Reliable.', '2026-03-01', 'Home', 'Lisbon');

  -- 13. Bourgogne Gamay - Louis Jadot
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'louis jadot' AND lower(w.name) = 'bourgogne gamay' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 3, 'Light and fruity. Cranberry, bright acidity. Good with charcuterie.', '2026-03-02', 'Brasserie Lipp', 'Paris');

  -- 14. Haut-Médoc 2017
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'château aney' AND lower(w.name) = 'haut-médoc' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 4, 'Well-aged left bank Bordeaux. Cassis, cedar, and graphite. Drinking well now.', '2026-03-05', 'Le Bar à Vin', 'Bordeaux');

  -- 15. Badia a Passignano 2021
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'antinori' AND lower(w.name) = 'badia a passignano' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 5, 'Exceptional Chianti Classico Riserva. Sour cherry, leather, and dried herbs.', '2026-03-08', 'Osteria dell''Enoteca', 'Florence');

  -- 16. Eruzione 1614, 2019
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'planeta' AND lower(w.name) = 'eruzione 1614' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 4, 'Volcanic Etna red. Smoky, red cherry, and a saline minerality. Unique.', '2026-03-10', 'Trattoria Catanese', 'Catania');

  -- 17. Douro 44 Barricas 2014
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'poeira' AND lower(w.name) = 'douro 44 barricas' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 5, 'A decade old and singing. Complex layers of dried fruit, spice, and oak. Magnificent.', '2026-03-12', 'Wine Bar do Castelo', 'Lisbon');

  -- 18. Reserva 2004 - Terras de Tavares
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'terras de tavares' AND lower(w.name) = 'reserva' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 4, 'Twenty years old. Garnet rim. Dried roses, forest floor, and soft tannins. Beautiful aged Dão.', '2026-03-13', 'Wine Bar do Castelo', 'Lisbon');

  -- 19. Galego Dourado Branco 2024
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'ramilo' AND lower(w.name) = 'galego dourado branco' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 3, 'Rare indigenous grape from Lisboa. Waxy texture, citrus peel, and almonds.', '2026-03-15', 'Cerveteca', 'Lisbon');

  -- 20. Baga Vinhas Velhas - Kompassus
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'kompassus' AND lower(w.name) = 'baga vinhas velhas' LIMIT 1;
  INSERT INTO tastings (user_id, vintage_id, verdict, notes, tasted_at, location_name, location_city)
  VALUES (test_user_id, v_id, 5, 'Old vine Baga at its best. Intense, concentrated, with wild berry and wet stone. Outstanding.', '2026-03-16', 'By the Wine', 'Lisbon');
END $$;

-- ============================================================================
-- 8. Scans for test user
-- ============================================================================

DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_id uuid;
BEGIN
  -- Scan 1: matched to Badia a Passignano 2021
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'antinori' AND lower(w.name) = 'badia a passignano' AND v.year = 2021 LIMIT 1;
  INSERT INTO scans (user_id, image_path, ocr_text, matched_vintage_id, confidence, match_method, vector_similarity)
  VALUES (test_user_id, 'scans/test-user/badia-a-passignano-2021.jpg', 'BADIA A PASSIGNANO CHIANTI CLASSICO GRAN SELEZIONE 2021 ANTINORI', v_id, 0.95, 'vector_identity', 0.9612);

  -- Scan 2: matched to Fitapreta 2023
  SELECT v.id INTO v_id FROM vintages v JOIN wines w ON v.wine_id = w.id JOIN producers p ON w.producer_id = p.id
    WHERE lower(p.name) = 'antónio maçanita' AND lower(w.name) = 'fitapreta' AND v.year = 2023 LIMIT 1;
  INSERT INTO scans (user_id, image_path, ocr_text, matched_vintage_id, confidence, match_method, vector_similarity)
  VALUES (test_user_id, 'scans/test-user/fitapreta-2023.jpg', 'FITAPRETA ALENTEJANO 2023 ANTONIO MACANITA', v_id, 0.88, 'vector_label', 0.8834);

  -- Scan 3: unmatched scan
  INSERT INTO scans (user_id, image_path, ocr_text, confidence)
  VALUES (test_user_id, 'scans/test-user/unknown-wine.jpg', 'QUINTA DO MYSTERIO RESERVA 2020', 0.00);
END $$;

-- ============================================================================
-- 9. Pending queue item for test user
-- ============================================================================

INSERT INTO wines_added_queue (user_id, image_url, ocr_text, status, idempotency_key, pending_tasting_notes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'queue/test-user/pending-label.jpg',
  'QUINTA DA PELLADA PRIMUS 2018 DÃO',
  'pending',
  'test-seed-pending-001',
  '{"verdict": 4, "notes": "Need to add this one. Looked great on the shelf."}'::jsonb
)
ON CONFLICT (idempotency_key) DO NOTHING;
