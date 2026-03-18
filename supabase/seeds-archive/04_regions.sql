-- Sample wine regions with geographic boundaries
-- Note: These are simplified boundaries for demo purposes

-- France
INSERT INTO regions (name, country, climate_zone_id) VALUES
('Bordeaux', 'France', (SELECT id FROM climate_zones WHERE koppen = 'Cfb')),
('Burgundy', 'France', (SELECT id FROM climate_zones WHERE koppen = 'Cfb')),
('Champagne', 'France', (SELECT id FROM climate_zones WHERE koppen = 'Cfb')),
('Rhône Valley', 'France', (SELECT id FROM climate_zones WHERE koppen = 'Csa')),
('Loire Valley', 'France', (SELECT id FROM climate_zones WHERE koppen = 'Cfb'));

-- Italy
INSERT INTO regions (name, country, climate_zone_id) VALUES
('Tuscany', 'Italy', (SELECT id FROM climate_zones WHERE koppen = 'Csa')),
('Piedmont', 'Italy', (SELECT id FROM climate_zones WHERE koppen = 'Cfa')),
('Veneto', 'Italy', (SELECT id FROM climate_zones WHERE koppen = 'Cfa'));

-- Spain
INSERT INTO regions (name, country, climate_zone_id) VALUES
('Rioja', 'Spain', (SELECT id FROM climate_zones WHERE koppen = 'Csa')),
('Ribera del Duero', 'Spain', (SELECT id FROM climate_zones WHERE koppen = 'BSk'));

-- USA
INSERT INTO regions (name, country, climate_zone_id) VALUES
('Napa Valley', 'USA', (SELECT id FROM climate_zones WHERE koppen = 'Csa')),
('Sonoma County', 'USA', (SELECT id FROM climate_zones WHERE koppen = 'Csb')),
('Willamette Valley', 'USA', (SELECT id FROM climate_zones WHERE koppen = 'Csb')),
('Finger Lakes', 'USA', (SELECT id FROM climate_zones WHERE koppen = 'Dfa'));

-- Australia
INSERT INTO regions (name, country, climate_zone_id) VALUES
('Barossa Valley', 'Australia', (SELECT id FROM climate_zones WHERE koppen = 'Csa')),
('Margaret River', 'Australia', (SELECT id FROM climate_zones WHERE koppen = 'Csb'));

-- New Zealand
INSERT INTO regions (name, country, climate_zone_id) VALUES
('Marlborough', 'New Zealand', (SELECT id FROM climate_zones WHERE koppen = 'Cfb')),
('Central Otago', 'New Zealand', (SELECT id FROM climate_zones WHERE koppen = 'Cfb'));

-- Germany
INSERT INTO regions (name, country, climate_zone_id) VALUES
('Mosel', 'Germany', (SELECT id FROM climate_zones WHERE koppen = 'Cfb')),
('Rheingau', 'Germany', (SELECT id FROM climate_zones WHERE koppen = 'Cfb'));

-- Argentina
INSERT INTO regions (name, country, climate_zone_id) VALUES
('Mendoza', 'Argentina', (SELECT id FROM climate_zones WHERE koppen = 'BSk'));

-- Chile
INSERT INTO regions (name, country, climate_zone_id) VALUES
('Maipo Valley', 'Chile', (SELECT id FROM climate_zones WHERE koppen = 'Csa'));

-- South Africa
INSERT INTO regions (name, country, climate_zone_id) VALUES
('Stellenbosch', 'South Africa', (SELECT id FROM climate_zones WHERE koppen = 'Csa'));