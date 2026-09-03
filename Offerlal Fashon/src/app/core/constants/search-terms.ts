/**
 * Popular search terms — ONE source.
 *
 * These previously existed as three divergent hardcoded lists: inline anchors
 * in header.html, `TRENDING` in features/search/search.ts, and
 * `POPULAR_SEARCHES` in shared/components/footer/footer.ts. They disagreed with
 * each other, so the "trending" terms a shopper saw depended on where they
 * happened to look.
 *
 * This is an interim home. These terms become admin-managed rows in the
 * SearchTerms table (pinned terms plus real logged query counts), at which
 * point this file is deleted and the three call sites read the same endpoint
 * they already read this constant from.
 */
export interface SearchTerm {
  /** What the shopper sees. */
  label: string;
  /** What actually gets searched — often broader than the label. */
  query: string;
}

export const POPULAR_SEARCH_TERMS: SearchTerm[] = [
  { label: 'red bridal lehenga', query: 'bridal lehenga' },
  { label: 'lehenga under ₹5,000', query: 'lehenga under' },
  { label: 'banarasi saree', query: 'saree' },
  { label: 'pink engagement lehenga', query: 'engagement lehenga' },
  { label: 'anarkali suit', query: 'anarkali' },
  { label: 'bridal lehenga under ₹15,000', query: 'bridal lehenga' },
];

/** The short list shown in a constrained space, e.g. the header dropdown. */
export const TRENDING_SEARCH_TERMS: SearchTerm[] = POPULAR_SEARCH_TERMS.slice(0, 3);

/**
 * Footer keyword links.
 *
 * Deliberately NOT merged into POPULAR_SEARCH_TERMS. These serve a different
 * job: a crawlable block of category keywords for SEO, in title case. Folding
 * twelve of them into the six-item trending list would quietly delete six
 * indexable internal links, which is a regression rather than a cleanup.
 * They live here so that one file becomes one SearchTerms table later, with
 * the role carried as a column.
 */
export const FOOTER_SEARCH_LINKS: string[] = [
  'Bridal Lehenga',
  'Wedding Saree',
  'Party Wear Lehenga',
  'Anarkali Suit',
  'Sharara Set',
  'Bridal Jewellery',
  'Reception Gown',
  'Sangeet Outfit',
  'Kids Ethnic Wear',
  'Banarasi Saree',
  'Kundan Choker',
  'Mehendi Dress',
];
