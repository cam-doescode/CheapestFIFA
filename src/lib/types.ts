export interface Match {
  id: number;
  matchNo: number;
  round: number;
  roundInfo: string;
  teams: string;
  date: string;
  competitionId: number;
  stadiumId: number;
  stadium: string;
  citySlug: string;
  city: string;
  countryCode: string;
  country: string;
}

export interface TicketListing {
  id: number;
  match: Match;
  availableCategories: number[];
  category: number;
  faceValue: number;
  floorPrice?: number;
  lastUpdate?: string;
  totalSupply: number;
  circulatingSupply: number;
  saleTransactions: number;
  saleVolume: number;
  lastSaleAssetId?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  rowSpan?: number;
}

export interface ResalePrice {
  matchNo: number;
  category: number;
  price: number;
  currency: string;
  scrapedAt: string;
}

export interface ResaleData {
  lastScraped: string;
  prices: ResalePrice[];
}

// Grouped ticket data for display
export interface MatchWithPrices {
  match: Match;
  tickets: TicketListing[];
  resalePrices: ResalePrice[];
}
