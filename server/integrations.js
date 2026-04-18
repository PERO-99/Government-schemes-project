async function fetchDataGovInSchemes({ apiKey, limit = 25 }) {
  // data.gov.in typically requires an API key; if not present, we disable.
  if (!apiKey) {
    return { ok: false, reason: 'Missing DATA_GOV_IN_API_KEY', schemes: [] };
  }

  // NOTE: Dataset resources vary; in real deployment you would configure a specific resource_id.
  // We keep this integration generic and safe, and treat it as optional.
  const url = new URL('https://api.data.gov.in/resource');
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));

  // No resource_id => cannot fetch meaningful data; treat as config requirement.
  return { ok: false, reason: 'Missing DATA_GOV_IN_RESOURCE_ID (configure to enable live data)', schemes: [], url: url.toString() };
}

module.exports = {
  fetchDataGovInSchemes,
};
