-- Sample producers and wines for testing
-- These are educational examples showing different terroirs and styles

-- Burgundy producers
WITH burgundy_id AS (SELECT id FROM regions WHERE name = 'Burgundy')
INSERT INTO producers (name, website, location, region_id) VALUES
('Domaine de la Romanée-Conti', 'https://romanee-conti.fr',
 ST_GeogFromText('POINT(4.9494 47.1621)'), (SELECT id FROM burgundy_id)),
('Domaine Leflaive', 'https://leflaive.fr',
 ST_GeogFromText('POINT(4.7451 46.9356)'), (SELECT id FROM burgundy_id));

-- Bordeaux producers
WITH bordeaux_id AS (SELECT id FROM regions WHERE name = 'Bordeaux')
INSERT INTO producers (name, website, location, region_id) VALUES
('Château Le Pin', 'https://chateaulepin.com',
 ST_GeogFromText('POINT(-0.1778 44.8978)'), (SELECT id FROM bordeaux_id)),
('Château Margaux', 'https://chateau-margaux.com',
 ST_GeogFromText('POINT(-0.6633 45.0408)'), (SELECT id FROM bordeaux_id));

-- Napa Valley producers
WITH napa_id AS (SELECT id FROM regions WHERE name = 'Napa Valley')
INSERT INTO producers (name, website, location, region_id) VALUES
('Opus One', 'https://opusonewinery.com',
 ST_GeogFromText('POINT(-122.3950 38.4391)'), (SELECT id FROM napa_id)),
('Screaming Eagle', NULL,
 ST_GeogFromText('POINT(-122.3608 38.4298)'), (SELECT id FROM napa_id));

-- Add sample wines for education
WITH producer_drc AS (SELECT id FROM producers WHERE name = 'Domaine de la Romanée-Conti'),
     producer_leflaive AS (SELECT id FROM producers WHERE name = 'Domaine Leflaive'),
     producer_lepin AS (SELECT id FROM producers WHERE name = 'Château Le Pin'),
     producer_margaux AS (SELECT id FROM producers WHERE name = 'Château Margaux'),
     producer_opus AS (SELECT id FROM producers WHERE name = 'Opus One')
INSERT INTO wines (name, producer_id, is_nv) VALUES
('La Tâche Grand Cru', (SELECT id FROM producer_drc), FALSE),
('Romanée-Conti Grand Cru', (SELECT id FROM producer_drc), FALSE),
('Montrachet Grand Cru', (SELECT id FROM producer_drc), FALSE),
('Bâtard-Montrachet Grand Cru', (SELECT id FROM producer_leflaive), FALSE),
('Le Pin Pomerol', (SELECT id FROM producer_lepin), FALSE),
('Château Margaux Premier Grand Cru Classé', (SELECT id FROM producer_margaux), FALSE),
('Opus One', (SELECT id FROM producer_opus), FALSE);

-- Add sample vintages with vector embeddings
WITH wine_latache AS (SELECT id FROM wines WHERE name = 'La Tâche Grand Cru'),
     wine_rc AS (SELECT id FROM wines WHERE name = 'Romanée-Conti Grand Cru'),
     wine_montrachet AS (SELECT id FROM wines WHERE name = 'Montrachet Grand Cru'),
     wine_lepin AS (SELECT id FROM wines WHERE name = 'Le Pin Pomerol'),
     wine_margaux AS (SELECT id FROM wines WHERE name = 'Château Margaux Premier Grand Cru Classé'),
     wine_opus AS (SELECT id FROM wines WHERE name = 'Opus One'),
     soil_limestone AS (SELECT id FROM soil_types WHERE name = 'Limestone'),
     soil_clay AS (SELECT id FROM soil_types WHERE name = 'Clay'),
     soil_gravel AS (SELECT id FROM soil_types WHERE name = 'Gravel'),
     climate_oceanic AS (SELECT id FROM climate_zones WHERE koppen = 'Cfb'),
     climate_med AS (SELECT id FROM climate_zones WHERE koppen = 'Csa')
INSERT INTO vintages (wine_id, year, abv, soil_type_id, climate_zone_id, varietal_vector) VALUES
((SELECT id FROM wine_latache), 2019, 13.5, (SELECT id FROM soil_limestone), (SELECT id FROM climate_oceanic),
 ARRAY_FILL(0.1, ARRAY[256])::vector),
((SELECT id FROM wine_rc), 2019, 13.0, (SELECT id FROM soil_limestone), (SELECT id FROM climate_oceanic),
 ARRAY_FILL(0.15, ARRAY[256])::vector),
((SELECT id FROM wine_montrachet), 2020, 13.5, (SELECT id FROM soil_limestone), (SELECT id FROM climate_oceanic),
 ARRAY_FILL(0.2, ARRAY[256])::vector),
((SELECT id FROM wine_lepin), 2019, 13.5, (SELECT id FROM soil_clay), (SELECT id FROM climate_oceanic),
 ARRAY_FILL(0.3, ARRAY[256])::vector),
((SELECT id FROM wine_margaux), 2018, 13.5, (SELECT id FROM soil_gravel), (SELECT id FROM climate_oceanic),
 ARRAY_FILL(0.35, ARRAY[256])::vector),
((SELECT id FROM wine_opus), 2019, 14.5, (SELECT id FROM soil_gravel), (SELECT id FROM climate_med),
 ARRAY_FILL(0.4, ARRAY[256])::vector);

-- Link vintages to varietals
WITH vintage_latache AS (SELECT id FROM vintages v JOIN wines w ON v.wine_id = w.id WHERE w.name = 'La Tâche Grand Cru' AND v.year = 2019),
     vintage_rc AS (SELECT id FROM vintages v JOIN wines w ON v.wine_id = w.id WHERE w.name = 'Romanée-Conti Grand Cru' AND v.year = 2019),
     vintage_montrachet AS (SELECT id FROM vintages v JOIN wines w ON v.wine_id = w.id WHERE w.name = 'Montrachet Grand Cru' AND v.year = 2020),
     vintage_lepin AS (SELECT id FROM vintages v JOIN wines w ON v.wine_id = w.id WHERE w.name = 'Le Pin Pomerol' AND v.year = 2019),
     vintage_margaux AS (SELECT id FROM vintages v JOIN wines w ON v.wine_id = w.id WHERE w.name = 'Château Margaux Premier Grand Cru Classé' AND v.year = 2018),
     vintage_opus AS (SELECT id FROM vintages v JOIN wines w ON v.wine_id = w.id WHERE w.name = 'Opus One' AND v.year = 2019),
     var_pinot AS (SELECT id FROM grape_varietals WHERE name = 'Pinot Noir'),
     var_chard AS (SELECT id FROM grape_varietals WHERE name = 'Chardonnay'),
     var_merlot AS (SELECT id FROM grape_varietals WHERE name = 'Merlot'),
     var_cab AS (SELECT id FROM grape_varietals WHERE name = 'Cabernet Sauvignon'),
     var_cabf AS (SELECT id FROM grape_varietals WHERE name = 'Cabernet Franc'),
     var_pv AS (SELECT id FROM grape_varietals WHERE name = 'Petit Verdot'),
     var_mal AS (SELECT id FROM grape_varietals WHERE name = 'Malbec')
INSERT INTO wine_varietals (vintage_id, varietal_id, percent) VALUES
((SELECT id FROM vintage_latache), (SELECT id FROM var_pinot), 100),
((SELECT id FROM vintage_rc), (SELECT id FROM var_pinot), 100),
((SELECT id FROM vintage_montrachet), (SELECT id FROM var_chard), 100),
((SELECT id FROM vintage_lepin), (SELECT id FROM var_merlot), 100),
((SELECT id FROM vintage_margaux), (SELECT id FROM var_cab), 87),
((SELECT id FROM vintage_margaux), (SELECT id FROM var_merlot), 8),
((SELECT id FROM vintage_margaux), (SELECT id FROM var_cabf), 3),
((SELECT id FROM vintage_margaux), (SELECT id FROM var_pv), 2),
((SELECT id FROM vintage_opus), (SELECT id FROM var_cab), 80),
((SELECT id FROM vintage_opus), (SELECT id FROM var_cabf), 8),
((SELECT id FROM vintage_opus), (SELECT id FROM var_merlot), 7),
((SELECT id FROM vintage_opus), (SELECT id FROM var_pv), 4),
((SELECT id FROM vintage_opus), (SELECT id FROM var_mal), 1);