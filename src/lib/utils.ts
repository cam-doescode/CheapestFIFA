export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function savingsPercent(faceValue: number, floorPrice: number): number {
  if (faceValue <= 0) return 0;
  return Math.round(((faceValue - floorPrice) / faceValue) * 100);
}

export function roundLabel(round: number, roundInfo: string): string {
  return roundInfo;
}

export function categoryLabel(category: number): string {
  return `Cat ${category}`;
}

export function getRoundOrder(round: number): number {
  // Lower round number = later in tournament = higher priority
  // 48 = group stage, 32 = R32, 16 = R16, 8 = QF, 4 = SF, 3 = 3rd place, 2 = Final
  const order: Record<number, number> = {
    48: 0,
    32: 1,
    16: 2,
    8: 3,
    4: 4,
    3: 5,
    2: 6,
  };
  return order[round] ?? 0;
}

// FIFA Collect referral config
const REFERRAL_CODE = "serfifathekick";

/** Append referral tracking to any FIFA Collect URL */
export function withReferral(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}referrer=${REFERRAL_CODE}`;
}

/** Build a FIFA Collect marketplace URL for a specific match+category */
export function getCollectUrl(matchNo: number, category?: number): string {
  const base = category
    ? `https://collect.fifa.com/marketplace/cat${category}-m${matchNo}`
    : `https://collect.fifa.com/marketplace`;
  return withReferral(base);
}

/** Map team name (as it appears in the API) to ISO 3166-1 alpha-2 code */
const TEAM_TO_ISO: Record<string, string> = {
  "Algeria": "dz",
  "Argentina": "ar",
  "Australia": "au",
  "Austria": "at",
  "Belgium": "be",
  "Brazil": "br",
  "Cabo Verde": "cv",
  "Canada": "ca",
  "Colombia": "co",
  "Croatia": "hr",
  "Curaçao": "cw",
  "Ecuador": "ec",
  "Egypt": "eg",
  "England": "gb-eng",
  "France": "fr",
  "Germany": "de",
  "Ghana": "gh",
  "Haiti": "ht",
  "IR Iran": "ir",
  "Iran": "ir",
  "Ivory Coast": "ci",
  "Japan": "jp",
  "Jordan": "jo",
  "Korea Republic": "kr",
  "Mexico": "mx",
  "Morocco": "ma",
  "Netherlands": "nl",
  "New Zealand": "nz",
  "Norway": "no",
  "Panama": "pa",
  "Portugal": "pt",
  "Qatar": "qa",
  "Saudi Arabia": "sa",
  "Scotland": "gb-sct",
  "Senegal": "sn",
  "South Africa": "za",
  "Spain": "es",
  "Switzerland": "ch",
  "Tunisia": "tn",
  "Uruguay": "uy",
  "USA": "us",
  "Uzbekistan": "uz",
};

/** Get flag CDN URL for a team name, or null if unknown */
export function getFlagUrl(teamName: string): string | null {
  const code = TEAM_TO_ISO[teamName.trim()];
  if (!code) return null;
  return `https://flagcdn.com/24x18/${code}.png`;
}

/** Parse "Team A vs. Team B" into individual team names */
export function parseTeams(teams: string): string[] {
  return teams.split(/\s+vs\.\s+/).map((t) => t.trim());
}

/** Get local stadium map path for a city */
export function getStadiumMapPath(city: string): string {
  const filename = city.replace(/\s+/g, "_");
  return `/stadium-maps/Stadium_Map_${filename}.png`;
}

export const ROUND_FILTERS = [
  { value: "all", label: "All Rounds" },
  { value: "48", label: "Group Stage" },
  { value: "32", label: "Round of 32" },
  { value: "16", label: "Round of 16" },
  { value: "8", label: "Quarter-finals" },
  { value: "4", label: "Semi-finals" },
  { value: "3", label: "Third Place" },
  { value: "2", label: "Final" },
] as const;
