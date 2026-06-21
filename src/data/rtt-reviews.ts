/**
 * Real fan reports of seats received after converting a FIFA Collect RTT/RTB,
 * shared on r/FIFACollect. Used as social proof in the "How RTT worked for others" section.
 *
 * To display these, save each screenshot to /public/rtt-reviews/<image>.
 */
export interface RttReview {
  id: string;
  image: string;       // path under /public
  category: string;    // "Cat 1" | "Cat 2"
  match: string;       // headline shown on the card
  detail?: string;     // section / price / extra context
  quote: string;       // pulled from the post or comment
  author: string;      // reddit username (no leading u/)
  url: string;         // source thread
}

export const RTT_REVIEWS: RttReview[] = [
  {
    id: "sofi-cat1",
    image: "/rtt-reviews/sofi-cat1.jpg",
    category: "Cat 1",
    match: "Cat 1 · SoFi Stadium, LA",
    detail: "2 rows back · $620",
    quote: "After months of being stressed out and wondering if I was getting screwed, FIFA came through with this. $620 for two rows back.",
    author: "Reyes_seyeR",
    url: "https://www.reddit.com/r/FIFACollect/comments/1ubxqps/rtb_cat_1/",
  },
  {
    id: "metlife-cat1",
    image: "/rtt-reviews/metlife-cat1.jpg",
    category: "Cat 1",
    match: "Cat 1 · MetLife Stadium",
    detail: "Section 108",
    quote: "FIFA Collect came through. Our Cat 1 seats — Section 108.",
    author: "kiwilagata",
    url: "https://www.reddit.com/r/FIFACollect/comments/1u984al/cat_2_france_vs_senegal_metlife_stadium/",
  },
  {
    id: "iraq-norway-cat2",
    image: "/rtt-reviews/iraq-norway-cat2.jpg",
    category: "Cat 2",
    match: "Cat 2 · Iraq vs. Norway",
    detail: "Great seats",
    quote: "Great seats.",
    author: "ReallyHawkward",
    url: "https://www.reddit.com/r/FIFACollect/comments/1u7ttp9/cat_2_iraq_vs_norway/",
  },
];
