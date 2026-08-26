/* =====================================================================
   Offerlal — Catalog structure seed (runs AFTER seed.sql)
   =====================================================================
   seed.sql loads the flat demo catalogue. This script derives the
   structural data that the flat seed cannot express:

     1. Materialised category paths (Categories.Path / Level)
     2. Real child categories promoted from the legacy free-text
        Products.SubCategory column
     3. Products repointed from their root category to the correct child

   Why promote SubCategory now: it is unmanaged free text with no FK, so
   it cannot be filtered, translated, given a landing page or targeted by
   an offer. At 60 products this is an hour's work; at 6,000 it is a
   project.

   Idempotent — safe to run repeatedly.
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

-- ---------------------------------------------------------------------
-- 1. Promote each distinct (CategoryId, SubCategory) pair to a real
--    child category. Slug is derived from the parent slug + sub-category.
-- ---------------------------------------------------------------------
-- Id   is derived from the PARENT ID   -> cat-accessories-clutch      (consistent, short)
-- Slug is the sub-category on its own  -> clutch                      (clean URLs, no
--      redundancy like "dupattas-clutches-footwear-clutch"). Slug is UNIQUE-constrained,
--      so a future collision fails loudly at seed time rather than silently.
;WITH subcats AS (
    SELECT DISTINCT
        p.CategoryId                                   AS ParentId,
        p.SubCategory                                  AS SubName,
        LOWER(REPLACE(REPLACE(p.SubCategory, ' & ', '-'), ' ', '-')) AS SubSlugPart
    FROM dbo.Products p
    WHERE p.SubCategory IS NOT NULL AND LTRIM(RTRIM(p.SubCategory)) <> ''
)
INSERT INTO dbo.Categories
    (Id, Slug, Name, Description, HeroImageUrl, ThumbnailUrl,
     ParentId, DisplayOrder, SeoTitle, SeoDescription, SeoKeywords, Path, Level, IsActive)
SELECT
    s.ParentId + '-' + s.SubSlugPart,
    s.SubSlugPart,
    s.SubName,
    s.SubName + ' - part of our ' + pc.Name + ' collection.',
    pc.HeroImageUrl,
    pc.ThumbnailUrl,
    s.ParentId,
    ROW_NUMBER() OVER (PARTITION BY s.ParentId ORDER BY s.SubName),
    s.SubName + ' | ' + pc.Name + ' | Offerlal Fashion',
    'Shop ' + s.SubName + ' from our curated ' + pc.Name + ' collection.',
    NULL,
    '',   -- Path computed in step 2
    1,
    1
FROM subcats s
JOIN dbo.Categories pc ON pc.Id = s.ParentId
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Categories x WHERE x.Id = s.ParentId + '-' + s.SubSlugPart
);

-- ---------------------------------------------------------------------
-- 2. Recompute materialised paths for the whole tree.
--    Descendant queries become: WHERE Path LIKE '/cat-parent/%'
-- ---------------------------------------------------------------------
UPDATE dbo.Categories
SET Path = '/' + Id + '/', Level = 0
WHERE ParentId IS NULL;

UPDATE c
SET c.Path = p.Path + c.Id + '/', c.Level = CAST(p.Level + 1 AS tinyint)
FROM dbo.Categories c
JOIN dbo.Categories p ON p.Id = c.ParentId
WHERE p.Path <> '';

-- ---------------------------------------------------------------------
-- 3. Repoint products from the root category to their child category.
--    SubCategory is deliberately left in place for now — it is dropped in
--    the contract phase, once the frontend no longer reads it.
-- ---------------------------------------------------------------------
UPDATE p
SET p.CategoryId = child.Id
FROM dbo.Products p
JOIN dbo.Categories child
     ON child.ParentId = p.CategoryId
    AND child.Name = p.SubCategory
WHERE p.SubCategory IS NOT NULL;

COMMIT TRANSACTION;

-- ---------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------
PRINT '--- Category tree ---';
SELECT Level, COUNT(*) AS Categories FROM dbo.Categories GROUP BY Level ORDER BY Level;

PRINT '--- Any category missing a path (want 0) ---';
SELECT COUNT(*) AS MissingPath FROM dbo.Categories WHERE Path = '' OR Path IS NULL;

PRINT '--- Products still on a root category that has children (want 0) ---';
SELECT COUNT(*) AS Misplaced
FROM dbo.Products p
WHERE p.SubCategory IS NOT NULL
  AND EXISTS (SELECT 1 FROM dbo.Categories ch WHERE ch.ParentId = p.CategoryId AND ch.Name = p.SubCategory);

PRINT '--- Descendant query check: all Bridal Lehengas incl. children ---';
SELECT COUNT(*) AS BridalProducts
FROM dbo.Products p
JOIN dbo.Categories c ON c.Id = p.CategoryId
WHERE c.Path LIKE '/cat-bridal-lehengas/%';

PRINT '--- Brand backfill (want all 60 on the house label) ---';
SELECT b.Name AS Brand, COUNT(*) AS Products
FROM dbo.Products p JOIN dbo.Brands b ON b.Id = p.BrandId
GROUP BY b.Name;
