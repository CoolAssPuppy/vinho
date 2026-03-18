-- Climate zones based on Köppen classification
INSERT INTO climate_zones (name, koppen, notes) VALUES
('Mediterranean', 'Csa', 'Hot dry summers, mild winters. Classic wine regions.'),
('Oceanic', 'Cfb', 'Moderate temperatures, year-round precipitation.'),
('Continental', 'Dfb', 'Large seasonal temperature differences, warm summers.'),
('Semi-arid', 'BSk', 'Low rainfall, hot summers. Irrigation often needed.'),
('Humid subtropical', 'Cfa', 'Hot humid summers, mild winters.'),
('Cool Continental', 'Dfa', 'Very cold winters, warm summers. Ice wine regions.'),
('Marine West Coast', 'Csb', 'Cool summers, mild winters. Pacific Northwest style.');