ALTER TABLE spg_page ADD COLUMN label VARCHAR(255);
UPDATE spg_page SET label = linktext;
DELETE FROM spg_sections WHERE section = 'DRAFT';
ALTER TABLE spg_page MODIFY label VARCHAR(255) NOT NULL;
