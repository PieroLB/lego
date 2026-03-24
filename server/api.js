import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import SALES from "./sources/vinted-77255.json" with { type: "json" };
import DEALS from "./sources/deals-latest.json" with { type: "json" };

const PORT = 8092;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());
app.use(cors());

const toNumber = (value) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value && typeof value === "object" && "amount" in value) {
    const parsed = parseFloat(value.amount);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

const toTimestamp = (value) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const asNumber = parseInt(value, 10);

    if (!Number.isNaN(asNumber)) {
      return asNumber;
    }

    const asDate = Date.parse(value);
    return Number.isNaN(asDate) ? 0 : Math.floor(asDate / 1000);
  }

  return 0;
};

app.get("/", (request, response) => {
  response.send({ ack: true });
});

app.get("/deals/search", (request, response) => {
  try {
    const { limit = "12", price, date, filterBy } = request.query;

    const parsedLimit = Math.max(1, parseInt(limit, 10) || 12);
    let result = [...DEALS];

    if (price) {
      const maxPrice = parseFloat(price);
      result = result.filter((deal) => parseFloat(deal.price) <= maxPrice);
    }
    console.log(result.length);
    if (date) {
      const minDate = Math.floor(new Date(date).getTime() / 1000);

      // console.log(minDate, );

      result = result.filter((deal) => deal.published >= minDate);
    }

    switch (filterBy) {
      case "best-discount":
        result = result.filter((deal) => toNumber(deal.discount) >= 50);
        break;
      case "most-commented":
        result = result.filter((deal) => toNumber(deal.comments) > 15);
        break;
      case "hot-deals":
        result = result.filter((deal) => toNumber(deal.temperature) > 100);
        break;
      default:
        break;
    }

    const sortedResult = result.sort(
      (a, b) => toNumber(a.price) - toNumber(b.price),
    );
    const limitedResult = sortedResult.slice(0, parsedLimit);

    return response.status(200).json({
      success: true,
      data: {
        limit: parsedLimit,
        total: sortedResult.length,
        result: limitedResult,
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({
      success: false,
      data: {
        limit: 0,
        total: 0,
        result: [],
      },
    });
  }
});

app.get("/deals/:id", (request, response) => {
  try {
    const { id } = request.params;
    const deal = DEALS.find((item) => item.uuid === id || item._id === id);

    if (!deal) {
      return response.status(404).json({
        success: false,
        data: { result: null },
      });
    }

    return response.status(200).json({
      success: true,
      data: { result: deal },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({
      success: false,
      data: { result: null },
    });
  }
});

app.get("/sales/search", (request, response) => {
  try {
    const { legoSetId, limit = "12" } = request.query;
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 12);
    const result = SALES[legoSetId] || [];
    const sortedResult = [...result].sort(
      (a, b) => toTimestamp(b.published) - toTimestamp(a.published),
    );
    const limitedResult = sortedResult.slice(0, parsedLimit);

    return response.status(200).json({
      success: true,
      data: {
        limit: parsedLimit,
        total: sortedResult.length,
        result: limitedResult,
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).send({
      success: false,
      data: {
        limit: 0,
        total: 0,
        result: [],
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`📡 Running on port ${PORT}`);
});
