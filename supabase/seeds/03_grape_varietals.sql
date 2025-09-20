-- Major grape varietals with genetic relationships
INSERT INTO grape_varietals (name, parent_a, parent_b) VALUES
-- Noble varieties (no known parents in this dataset)
('Pinot Noir', NULL, NULL),
('Chardonnay', NULL, NULL),
('Riesling', NULL, NULL),
('Chenin Blanc', NULL, NULL),
('Sauvignon Blanc', NULL, NULL),
('Cabernet Franc', NULL, NULL),
('Merlot', NULL, NULL),
('Syrah', NULL, NULL),
('Grenache', NULL, NULL),
('Nebbiolo', NULL, NULL),
('Sangiovese', NULL, NULL),
('Tempranillo', NULL, NULL),
('Pinot Blanc', NULL, NULL),
('Pinot Gris', NULL, NULL),
('Gewürztraminer', NULL, NULL),
('Muscat Blanc', NULL, NULL),
('Sémillon', NULL, NULL),
('Viognier', NULL, NULL),
('Malbec', NULL, NULL),
('Petit Verdot', NULL, NULL),
('Carménère', NULL, NULL),
('Mourvèdre', NULL, NULL),
('Cinsault', NULL, NULL),
('Carignan', NULL, NULL),
('Barbera', NULL, NULL),
('Dolcetto', NULL, NULL),
('Gamay', NULL, NULL),
('Albariño', NULL, NULL),
('Verdejo', NULL, NULL),
('Grüner Veltliner', NULL, NULL);

-- Add Cabernet Sauvignon (Cabernet Franc x Sauvignon Blanc cross)
INSERT INTO grape_varietals (name, parent_a, parent_b)
SELECT 'Cabernet Sauvignon',
       (SELECT id FROM grape_varietals WHERE name = 'Cabernet Franc'),
       (SELECT id FROM grape_varietals WHERE name = 'Sauvignon Blanc');

-- Add Pinotage (Pinot Noir x Cinsault cross)
INSERT INTO grape_varietals (name, parent_a, parent_b)
SELECT 'Pinotage',
       (SELECT id FROM grape_varietals WHERE name = 'Pinot Noir'),
       (SELECT id FROM grape_varietals WHERE name = 'Cinsault');

-- Add Müller-Thurgau (Riesling x Madeleine Royale cross - using Riesling only here)
INSERT INTO grape_varietals (name, parent_a, parent_b)
SELECT 'Müller-Thurgau',
       (SELECT id FROM grape_varietals WHERE name = 'Riesling'),
       NULL;