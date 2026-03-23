"use strict";

const API_BASE_URL = "https://lego-api-blue.vercel.app";
const FAVORITES_STORAGE_KEY = "FAVORITE_DEALS";

const state = {
  rawDeals: [],
  currentDeals: [],
  currentPagination: {
    currentPage: 1,
    pageCount: 1,
    pageSize: 6,
    count: 0,
  },
};

const selectShow = document.querySelector("#show-select");
const selectPage = document.querySelector("#page-select");
const selectSort = document.querySelector("#sort-select");
const selectLegoSetIds = document.querySelector("#lego-set-id-select");
const sectionDeals = document.querySelector("#deals");
const sectionSales = document.querySelector("#sales");

const filterDiscount = document.querySelector("#filter-discount");
const filterCommented = document.querySelector("#filter-commented");
const filterDeals = document.querySelector("#filter-deals");
const filterFavorite = document.querySelector("#filter-favorite");

const spanNbDeals = document.querySelector("#nbDeals");
const spanNbSales = document.querySelector("#nbSales");
const spanP5 = document.querySelector("#p5");
const spanP25 = document.querySelector("#p25");
const spanP50 = document.querySelector("#p50");
const spanLifetime = document.querySelector("#lifetime");

const toNumber = (value) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return parseFloat(value);
  }

  if (value && typeof value === "object" && "amount" in value) {
    return parseFloat(value.amount);
  }

  return 0;
};

const getFavoriteIds = () => {
  const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

const saveFavoriteIds = (favorites) => {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
};

const toggleFavorite = (uuid) => {
  const favorites = getFavoriteIds();
  const alreadyFavorite = favorites.includes(uuid);
  const updatedFavorites = alreadyFavorite
    ? favorites.filter((favoriteUuid) => favoriteUuid !== uuid)
    : [...favorites, uuid];

  saveFavoriteIds(updatedFavorites);
};

const sortDeals = (deals, sortType) => {
  const sorted = [...deals];

  switch (sortType) {
    case "price-desc":
      return sorted.sort((a, b) => toNumber(b.price) - toNumber(a.price));
    case "date-asc":
      return sorted.sort(
        (a, b) => toNumber(b.published) - toNumber(a.published),
      );
    case "date-desc":
      return sorted.sort(
        (a, b) => toNumber(a.published) - toNumber(b.published),
      );
    case "price-asc":
    default:
      return sorted.sort((a, b) => toNumber(a.price) - toNumber(b.price));
  }
};

const applyFiltersAndSort = (deals) => {
  const favoriteIds = getFavoriteIds();
  let filtered = [...deals];

  if (filterDiscount.checked) {
    filtered = filtered.filter((deal) => toNumber(deal.discount) >= 50);
  }

  if (filterCommented.checked) {
    filtered = filtered.filter((deal) => toNumber(deal.comments) > 15);
  }

  if (filterDeals.checked) {
    filtered = filtered.filter((deal) => toNumber(deal.temperature) > 100);
  }

  if (filterFavorite.checked) {
    filtered = filtered.filter((deal) => favoriteIds.includes(deal.uuid));
  }

  return sortDeals(filtered, selectSort.value);
};

const updateCurrentDeals = ({ result, meta }) => {
  state.rawDeals = result;
  state.currentPagination = meta;
  state.currentDeals = applyFiltersAndSort(result);
};

const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/deals?page=${page}&size=${size}`,
    );
    const body = await response.json();

    if (body.success !== true || !body.data) {
      throw new Error("Invalid deals response");
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {
      result: state.rawDeals,
      meta: state.currentPagination,
    };
  }
};

const fetchSales = async (legoSetId) => {
  try {
    if (!legoSetId) {
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/sales?id=${legoSetId}`);
    const body = await response.json();

    if (
      body.success !== true ||
      !body.data ||
      !Array.isArray(body.data.result)
    ) {
      return [];
    }

    return body.data.result;
  } catch (error) {
    console.error(error);
    return [];
  }
};

const renderDeals = (deals) => {
  const favorites = getFavoriteIds();

  const template = deals
    .map((deal) => {
      const isFavorite = favorites.includes(deal.uuid);
      const favoriteLabel = isFavorite ? "Unfavorite" : "Favorite";

      return `
      <article class="deal" id="${deal.uuid}">
        <p><strong>#${deal.id || "n/a"}</strong> - ${deal.community || "unknown"}</p>
        <a href="${deal.link}" target="_blank" rel="noopener noreferrer">${deal.title}</a>
        <p>Price: ${toNumber(deal.price).toFixed(2)} EUR</p>
        <p>Discount: ${deal.discount ?? "n/a"}% | Comments: ${deal.comments ?? 0} | Heat: ${deal.temperature ?? 0}</p>
        <button type="button" data-favorite-id="${deal.uuid}">${favoriteLabel}</button>
      </article>
    `;
    })
    .join("");

  sectionDeals.innerHTML = `<h2>Deals</h2>${template || "<p>No deals to display.</p>"}`;
};

const renderPagination = (pagination) => {
  const pageCount = Math.max(1, pagination.pageCount || 1);
  const currentPage = Math.min(
    Math.max(1, pagination.currentPage || 1),
    pageCount,
  );

  const options = Array.from(
    { length: pageCount },
    (_, index) => `<option value="${index + 1}">${index + 1}</option>`,
  ).join("");

  selectPage.innerHTML = options;
  selectPage.value = String(currentPage);
};

const renderLegoSetIds = (deals) => {
  const ids = [...new Set(getIdsFromDeals(deals).filter(Boolean))].sort();
  const options = ids
    .map((id) => `<option value="${id}">${id}</option>`)
    .join("");

  selectLegoSetIds.innerHTML = options;
};

const percentile = (values, p) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length),
  );

  return sorted[index];
};

const renderSales = (sales) => {
  const sortedSales = [...sales].sort(
    (a, b) => toNumber(b.published) - toNumber(a.published),
  );

  const list = sortedSales
    .map((sale) => {
      const price = toNumber(sale.price).toFixed(2);
      const publishedText = sale.published
        ? new Date(toNumber(sale.published) * 1000).toLocaleDateString()
        : "n/a";

      return `<li><a href="${sale.link}" target="_blank" rel="noopener noreferrer">${sale.title}</a> - ${price} EUR - ${publishedText}</li>`;
    })
    .join("");

  sectionSales.innerHTML = `<h2>Vinted Sales</h2>${list ? `<ul>${list}</ul>` : "<p>No sales for this set.</p>"}`;
};

const renderIndicators = (deals, sales, pagination) => {
  const salesPrices = sales.map((sale) => toNumber(sale.price));
  const publishedValues = sales
    .map((sale) => toNumber(sale.published))
    .filter((value) => value > 0);

  spanNbDeals.textContent = String(deals.length || pagination.count || 0);
  spanNbSales.textContent = String(sales.length);
  spanP5.textContent = sales.length
    ? percentile(salesPrices, 5).toFixed(2)
    : "0";
  spanP25.textContent = sales.length
    ? percentile(salesPrices, 25).toFixed(2)
    : "0";
  spanP50.textContent = sales.length
    ? percentile(salesPrices, 50).toFixed(2)
    : "0";

  if (publishedValues.length > 1) {
    const lifetimeSeconds =
      Math.max(...publishedValues) - Math.min(...publishedValues);
    const lifetimeDays = Math.round(lifetimeSeconds / (60 * 60 * 24));
    spanLifetime.textContent = `${lifetimeDays} days`;
  } else {
    spanLifetime.textContent = "n/a";
  }
};

const render = async () => {
  const legoSetId = selectLegoSetIds.value;
  const sales = await fetchSales(legoSetId);

  renderDeals(state.currentDeals);
  renderPagination(state.currentPagination);
  renderLegoSetIds(state.rawDeals);
  renderSales(sales);
  renderIndicators(state.currentDeals, sales, state.currentPagination);
};

const refreshDeals = async (
  page = 1,
  size = parseInt(selectShow.value, 10),
) => {
  const data = await fetchDeals(page, size);
  updateCurrentDeals(data);
  await render();
};

selectShow.addEventListener("change", async (event) => {
  const size = parseInt(event.target.value, 10);
  await refreshDeals(1, size);
});

selectPage.addEventListener("change", async (event) => {
  const page = parseInt(event.target.value, 10);
  const size = parseInt(selectShow.value, 10);
  await refreshDeals(page, size);
});

selectSort.addEventListener("change", async () => {
  state.currentDeals = applyFiltersAndSort(state.rawDeals);
  await render();
});

[filterDiscount, filterCommented, filterDeals, filterFavorite].forEach(
  (checkbox) => {
    checkbox.addEventListener("change", async () => {
      state.currentDeals = applyFiltersAndSort(state.rawDeals);
      await render();
    });
  },
);

selectLegoSetIds.addEventListener("change", async () => {
  await render();
});

sectionDeals.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const favoriteId = target.dataset.favoriteId;

  if (!favoriteId) {
    return;
  }

  toggleFavorite(favoriteId);
  state.currentDeals = applyFiltersAndSort(state.rawDeals);
  await render();
});

document.addEventListener("DOMContentLoaded", async () => {
  selectShow.value = "6";
  filterDiscount.checked = false;
  filterCommented.checked = false;
  filterDeals.checked = false;
  filterFavorite.checked = false;
  await refreshDeals(1, 6);
});
