/* eslint-disable no-console, no-process-exit */
import * as avenuedelabrique from "./websites/avenuedelabrique.js";
import * as dealabs from "./websites/dealabs.js";
import * as vinted from "./websites/vinted.js";
import { writeFileSync } from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const writeJsonFile = (filename, data) => {
  const outputPath = path.join(__dirname, "sources", filename);
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`saved ${outputPath}`);
};

async function scrapeDealabs(website = "https://www.dealabs.com/groupe/lego") {
  try {
    console.log(`🕵️‍♀️  scraping ${website} website`);

    const deals = await dealabs.scrape(website);

    writeJsonFile("deals-latest.json", deals);
    console.log(deals);
    console.log("done");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function scrapeADLB(
  website = "https://www.avenuedelabrique.com/promotions-et-bons-plans-lego",
) {
  try {
    console.log(`🕵️‍♀️  browsing ${website} website`);

    const deals = await avenuedelabrique.scrape(website);

    writeJsonFile("avenuedelabrique-latest.json", deals);
    console.log(deals);
    console.log("done");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function scrapeVinted(lego) {
  try {
    console.log(`🕵️‍♀️  scraping lego ${lego} from vinted.fr`);

    const sales = await vinted.scrape(lego);

    writeJsonFile(`vinted-${lego}.json`, sales);
    console.log(sales);
    console.log("done");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

const [, , param] = process.argv;

if (!param) {
  scrapeDealabs();
} else if (param.startsWith("http") && param.includes("dealabs.com")) {
  scrapeDealabs(param);
} else if (param.startsWith("http")) {
  scrapeADLB(param);
} else {
  scrapeVinted(param);
}
