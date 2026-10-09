/**
 * Builds pagination + sorting values from query params, with safe defaults
 * and a whitelist of sortable columns (prevents SQL injection via column names).
 */
function getPagination(query, defaultLimit = 10, maxLimit = 100) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function getSort(query, allowedColumns, defaultColumn) {
  const sortBy = allowedColumns.includes(query.sortBy) ? query.sortBy : defaultColumn;
  const order = String(query.order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return { sortBy, order };
}

module.exports = { getPagination, getSort };
