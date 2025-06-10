// utils/pagination.js

const isValidDate = (dateString) => {
  return !isNaN(Date.parse(dateString));
};

const createPageLink = (
  page,
  currentPage,
  limit,
  sort,
  order,
  search,
  filter_ad_id,
  filter_from,
  filter_to,
  text = null
) => {
  const url = createUrl(
    page,
    limit,
    sort,
    order,
    search,
    filter_ad_id,
    filter_from,
    filter_to
  );
  return {
    url,
    label: text || page,
    active: page === currentPage,
  };
};

const createUrl = (
  page,
  limit,
  sort,
  order,
  search,
  filter_ad_id,
  filter_from,
  filter_to
) => {
  const params = new URLSearchParams({
    page,
    items_per_page: limit,
    sort,
    order,
    search,
    filter_ad_id,
    filter_from,
    filter_to,
  });
  return `?${params.toString()}`;
};

module.exports = {
  isValidDate,
  createPageLink,
  createUrl,
};
