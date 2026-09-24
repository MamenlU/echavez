/**
 * Converts a database category name into the frontend category-image filename.
 *
 * Examples:
 * Tools              -> tools_category.png
 * Construction       -> construction_category.png
 * Electrical         -> electrical_category.png
 * Lumber & Wood      -> lumber_and_wood_category.png
 * Roofing Materials  -> roofing_materials_category.png
 * Tiles & Flooring   -> tiles_and_flooring_category.png
 */
export const getCategoryImageFilename = (category: string): string => {
  const normalized = String(category || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${normalized || 'general'}_category.png`;
};

export const getCategoryImage = (category: string): string =>
  `/images/categories/${getCategoryImageFilename(category)}`;

export const storefrontNavLinks = [
  { label: 'Home', href: '/' },
  { label: 'Categories', href: '/#categories' },
  { label: 'Products', href: '/#products' },
  { label: 'How It Works', href: '/#how-it-works' },
];
