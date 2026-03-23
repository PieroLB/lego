import * as cheerio from "cheerio";
import { v5 as uuidv5 } from "uuid";

const DEALABS_URL = "https://www.dealabs.com/groupe/lego";

const extractIdFromLink = (link) => {
  if (!link) {
    return null;
  }

  const idFromDealPath = link.match(/\/bons-plans\/(\d{4,6})/);

  if (idFromDealPath && idFromDealPath[1]) {
    return idFromDealPath[1];
  }

  const idFromSlug = link.match(/(?:^|\D)(\d{4,6})(?:\D|$)/);

  return idFromSlug ? idFromSlug[1] : null;
};

const parseNumber = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const sanitized = value.replace(/[^0-9,.-]/g, "").replace(",", ".");

  const number = parseFloat(sanitized);

  return Number.isNaN(number) ? null : number;
};

const parse = (html) => {
  const $ = cheerio.load(html);

  return $("article")
    .map((_, article) => {
      const root = $(article);
      const anchor = root.find('a[href*="/bons-plans/"]').first();
      const linkPath = anchor.attr("href");

      if (!linkPath) {
        return null;
      }

      const link = linkPath.startsWith("http")
        ? linkPath
        : `https://www.dealabs.com${linkPath}`;

      const title =
        anchor.text().trim() || root.find("h2, h3").first().text().trim();
      const priceText = root
        .find('[data-t="thread-price"], .thread-price')
        .first()
        .text()
        .trim();
      const discountText = root
        .find('[data-t="thread-discount"], .thread-discount')
        .first()
        .text()
        .trim();
      const commentsText = root
        .find('[data-t="comments-count"], .cept-comment-link')
        .first()
        .text()
        .trim();
      const temperatureText = root
        .find('[data-t="temperature"], .thread-temperature')
        .first()
        .text()
        .trim();
      const photo = root.find("img").first().attr("src") || null;

      return {
        link,
        retail: null,
        price: parseNumber(priceText),
        discount: parseNumber(discountText),
        temperature: parseNumber(temperatureText),
        photo,
        comments: parseNumber(commentsText) || 0,
        published: Math.floor(Date.now() / 1000),
        title,
        id: extractIdFromLink(link),
        community: "dealabs",
        uuid: uuidv5(link, uuidv5.URL),
      };
    })
    .get()
    .filter((deal) => deal && deal.title && deal.link);
};

const scrape = async (url = DEALABS_URL) => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(response.status, response.statusText);
      return [];
    }

    const body = await response.text();

    return parse(body);
  } catch (error) {
    console.error(error);
    return [];
  }
};

export { scrape };
