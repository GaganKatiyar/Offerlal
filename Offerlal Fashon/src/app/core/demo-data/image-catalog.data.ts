/**
 * Curated pool of real, verified Pexels photo IDs (free-to-use, no attribution
 * required). Every ID below was confirmed to resolve with a live HTTP GET
 * before being added here. Organized by theme so product/hero authoring can
 * pull a fitting, non-repetitive image per item.
 */
export function pexelsImage(id: number, width: number): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

export interface CatalogImage {
  id: number;
  alt: string;
}

export const IMAGE_POOL = {
  bridal: [
    { id: 12411105, alt: 'Bride in a richly embroidered red bridal lehenga' },
    { id: 13661786, alt: 'Bride in a red lehenga seated on stone steps' },
    { id: 8752674, alt: 'Bride in a red lehenga during a traditional dance' },
    { id: 27212066, alt: 'Indian bride solo portrait in bridal wear' },
    { id: 5376556, alt: 'Young Indian bride in traditional bridal dress' },
    { id: 19869152, alt: 'Bride in traditional bridal dress by a mirror' },
    { id: 31668770, alt: 'Bride in a red bridal veil, outdoor portrait' },
    { id: 30825616, alt: 'Elegant Indian bride in traditional bridal attire' },
    { id: 35586107, alt: 'Bridal portrait with statement jewellery' },
    { id: 30171215, alt: 'Bride in a red bridal saree holding sindoor' },
  ] as CatalogImage[],

  coupleReception: [
    { id: 12762494, alt: 'Three women in bridal lehengas on a swing' },
    { id: 36967369, alt: 'Couple in elegant traditional wedding attire' },
    { id: 4459170, alt: 'Couple in traditional wedding clothes' },
    { id: 6544197, alt: 'Couple in traditional wedding clothing' },
    { id: 19734103, alt: 'Wedding couple in traditional attire' },
    { id: 32878576, alt: 'Pre-wedding outdoor portrait in traditional wear' },
    { id: 36762647, alt: 'Couple at an Indian temple in wedding attire' },
    { id: 20513771, alt: 'Bride and groom in traditional wedding clothing' },
  ] as CatalogImage[],

  partyWear: [
    { id: 13204680, alt: 'Model on the runway in a red lehenga' },
    { id: 17503286, alt: 'Model at a fashion show in traditional wear' },
    { id: 13192083, alt: 'Model on the runway in an embellished dress' },
    { id: 16612752, alt: 'Model in traditional occasion wear, studio portrait' },
    { id: 7037114, alt: 'Woman in an occasion dress against a stone wall' },
    { id: 9511239, alt: 'Model walking the runway at a fashion show' },
    { id: 13018960, alt: 'Models in coordinated occasion wear' },
    { id: 19248233, alt: 'Model in a contemporary fusion gown' },
  ] as CatalogImage[],

  sarees: [
    { id: 20614154, alt: 'Woman in a pink traditional saree' },
    { id: 16916681, alt: 'Woman in a traditional saree, outdoor portrait' },
    { id: 3680632, alt: 'Woman in a pink traditional saree in a park' },
    { id: 30918414, alt: 'Woman in a pink traditional saree by a brick wall' },
    { id: 15751055, alt: 'Woman in a green traditional dress and shawl' },
    { id: 15602468, alt: 'Portrait of a woman in traditional dress, sunlit' },
  ] as CatalogImage[],

  mehendiHands: [
    { id: 7176352, alt: 'Mehndi being applied to a hand' },
    { id: 36103111, alt: 'Colourful henna design on hands' },
    { id: 34260692, alt: 'Hands with henna and gold rings' },
    { id: 1444441, alt: 'Hand with gold bangle and mehndi' },
    { id: 18628263, alt: 'Hands of a couple at a traditional wedding' },
    { id: 16155926, alt: 'Close-up of hands at a wedding ceremony' },
    { id: 12200847, alt: 'Bride and groom holding hands at a ceremony' },
    { id: 31965606, alt: 'Wedding couple holding hands, close-up' },
    { id: 20417059, alt: 'Newlywed couple holding hands outdoors' },
    { id: 35464490, alt: 'Couple holding hands in wedding attire' },
  ] as CatalogImage[],

  jewellery: [
    { id: 15185205, alt: 'Couple in traditional attire with statement jewellery' },
    { id: 30289598, alt: 'Wedding portrait with warm bokeh lighting' },
    { id: 34260692, alt: 'Hands adorned with gold rings and henna' },
    { id: 1444441, alt: 'Gold bangle detail on the wrist' },
  ] as CatalogImage[],

  kids: [
    { id: 30723693, alt: 'Child twirling in traditional festive attire' },
    { id: 18589057, alt: 'Boy dressed in traditional Indian clothing' },
    { id: 7364254, alt: 'Child in vibrant traditional costume' },
    { id: 14325735, alt: 'Children in traditional festive clothing' },
    { id: 13656041, alt: 'Little boy in traditional festive clothing' },
    { id: 11685744, alt: 'Little girls in traditional festive dresses' },
    { id: 34489787, alt: 'Boy in traditional festive attire' },
    { id: 4279625, alt: 'Boys in traditional festive clothing' },
    { id: 16574686, alt: 'Boy in yellow traditional festive clothing' },
  ] as CatalogImage[],
};

export type ImagePoolKey = keyof typeof IMAGE_POOL;
