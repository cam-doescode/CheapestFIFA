import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { resolve } from "path";

const RESALE_URL =
  "https://fwc26-resale-usd.tickets.fifa.com/secure/selection/event/date/product/10229225515651/contact-advantages/10229516236677,10229516236679/lang/en";
const OUTPUT_PATH = resolve(__dirname, "../src/data/resale-prices.json");
const MAX_WAIT_MS = 120_000; // 2 min max wait for queue

interface ScrapedPrice {
  matchNo: number;
  category: number;
  price: number;
  currency: string;
  available: boolean;
  scrapedAt: string;
}

async function scrape() {
  console.log("Launching browser...");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });

  const page = await context.newPage();

  try {
    console.log("Navigating to FIFA Resale...");
    await page.goto(RESALE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Debug: log page info
    const title = await page.title();
    const url = page.url();
    console.log(`Page title: "${title}"`);
    console.log(`Page URL: ${url}`);

    // Check if we're in a waiting room or queue
    if (title.toLowerCase().includes("waiting") || url.includes("pkpcontroller") || url.includes("queue")) {
      console.log("In waiting room/queue. Waiting for redirect...");
      await page.screenshot({ path: "/tmp/resale-queue.png" });
      console.log("Screenshot saved to /tmp/resale-queue.png");
      try {
        await page.waitForURL(
          (u) => !u.toString().includes("pkpcontroller") && !u.toString().includes("queue"),
          { timeout: MAX_WAIT_MS }
        );
        console.log("Passed waiting room!");
      } catch {
        console.log("Timed out in waiting room. The resale marketplace may be closed or paused.");
        await browser.close();
        return;
      }
    }

    // Check for pause/maintenance page
    const bodyText = await page.textContent("body");
    if (bodyText?.includes("temporarily unavailable") || bodyText?.includes("maintenance")) {
      console.log("Site is temporarily unavailable / in maintenance.");
      await page.screenshot({ path: "/tmp/resale-maintenance.png" });
      await browser.close();
      return;
    }

    // Wait for match listings to load
    console.log("Waiting for match listings...");
    await page.screenshot({ path: "/tmp/resale-page.png" });
    console.log("Screenshot saved to /tmp/resale-page.png");
    await page.waitForSelector(".performance", { timeout: 30_000 });

    // Extract all match data
    const prices: ScrapedPrice[] = await page.evaluate(() => {
      const results: ScrapedPrice[] = [];
      const now = new Date().toISOString();

      const performances = document.querySelectorAll("li.performance");

      for (const perf of performances) {
        // Extract match number from event_code element
        const matchCodeEl = perf.querySelector('[class*="match_round_code"]');
        const matchCode = matchCodeEl?.textContent?.trim() || "";
        const matchNoMatch = matchCode.match(/M(\d+)/);
        if (!matchNoMatch) continue;
        const matchNo = parseInt(matchNoMatch[1]);

        // Check availability
        const soldOut = perf.classList.contains("sold_out");
        const availabilityEl = perf.querySelector(".availability_status");
        const available =
          !soldOut &&
          !availabilityEl?.classList.contains("sold_out");

        // Extract price from data-amount (in cents)
        const amountEl = perf.querySelector("[data-amount]");
        const amountCents = amountEl
          ? parseInt(amountEl.getAttribute("data-amount") || "0")
          : 0;
        const price = amountCents / 100;

        // This page shows one price per match (cheapest available category)
        // Category info may not be visible on the list view
        results.push({
          matchNo,
          category: 0, // category not distinguishable on list page
          price,
          currency: "USD",
          available,
          scrapedAt: now,
        });
      }

      return results;
    });

    console.log(`Scraped ${prices.length} matches`);

    const available = prices.filter((p) => p.available);
    console.log(`  ${available.length} available, ${prices.length - available.length} sold out`);

    if (available.length > 0) {
      console.log(
        `  Price range: $${Math.min(...available.map((p) => p.price))} - $${Math.max(...available.map((p) => p.price))}`
      );
    }

    // Write output
    const output = {
      lastScraped: new Date().toISOString(),
      prices: prices.filter((p) => p.available && p.price > 0),
    };

    writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
    console.log(`Wrote ${output.prices.length} prices to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error("Scraping failed:", error);
  } finally {
    await browser.close();
  }
}

scrape();
