import * as cheerio from "cheerio";
import { v5 as uuidv5 } from "uuid";

const DEALABS_URL = "https://www.dealabs.com/groupe/lego";

const toNumber = (value) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

const toInteger = (value) => {
  if (typeof value === "number") {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

const buildDealLink = (thread) => {
  if (thread.link && thread.link.startsWith("http")) {
    return thread.link;
  }

  if (thread.titleSlug && thread.threadId) {
    return `https://www.dealabs.com/bons-plans/${thread.titleSlug}-${thread.threadId}`;
  }

  if (thread.shareableLink) {
    return thread.shareableLink;
  }

  return "";
};

const buildPhotoUrl = (thread) => {
  const image = thread.mainImage;

  if (!image || !image.path || !image.slotId || !image.name) {
    return "";
  }

  return `https://static-pepper.dealabs.com/${image.path}/${image.slotId}/${image.name}/re/300x300/qt/60/${image.name}.jpg`;
};

const extractLegoSetId = (thread) => {
  const candidates = [thread.title, thread.titleSlug]
    .filter(Boolean)
    .join(" ")
    .match(/\b\d{4,6}\b/g);

  if (!candidates || candidates.length === 0) {
    return null;
  }

  return candidates[candidates.length - 1];
};

const parse = (html) => {
  const $ = cheerio.load(html);

  return $("article")
    .map((_, article) => {
      try {
        const div = $(article).find(".js-vue3");
        const data = div.attr("data-vue3");

        if (!data) {
          return null;
        }

        const dataParsed = JSON.parse(data);
        const thread = dataParsed?.props?.thread;

        if (!thread) {
          return null;
        }

        const link = buildDealLink(thread);
        const uuid = uuidv5(
          link || String(thread.threadId || thread.title || "dealabs"),
          uuidv5.URL,
        );

        const price = toNumber(thread.price);
        const retail = toNumber(thread.nextBestPrice);
        const hasValidRetail = retail > 0;
        const hasValidPrice = price > 0;

        let discount = toInteger(thread.percentage);

        if (
          discount <= 0 &&
          hasValidRetail &&
          hasValidPrice &&
          retail >= price
        ) {
          discount = Math.round(((retail - price) / retail) * 100);
        }

        return {
          _id: uuid,
          link,
          retail,
          price,
          discount,
          temperature: toNumber(thread.temperature),
          photo: buildPhotoUrl(thread),
          comments: toInteger(thread.commentCount),
          published: toInteger(thread.publishedAt),
          title: thread.title || "",
          id: extractLegoSetId(thread),
          community: "dealabs",
          uuid,
        };
      } catch (error) {
        return null;
      }
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
