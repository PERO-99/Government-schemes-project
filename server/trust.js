const { URL } = require('node:url');

const ALLOWLIST_DOMAINS = [
  'gov.in',
  'nic.in',
  'pmjay.gov.in',
  'pmkisan.gov.in',
  'nrega.nic.in',
  'pmayg.nic.in',
  'scholarships.gov.in',
  'pmjdy.gov.in',
];

function domainFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowlistedDomain(hostname) {
  if (!hostname) return false;
  return ALLOWLIST_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

function computeTrust({ officialLink, suspicious, suspiciousReason, verified, domains = [] }) {
  const linkDomain = domainFromUrl(officialLink);
  const allDomains = Array.from(new Set([...(domains || []), ...(linkDomain ? [linkDomain] : [])]));

  if (suspicious) {
    return {
      badge: 'suspicious',
      label: 'Suspicious',
      reason: suspiciousReason || 'User reports or domain mismatch',
      domains: allDomains,
    };
  }

  const allowlisted = allDomains.some(isAllowlistedDomain);

  if (verified && allowlisted) {
    return {
      badge: 'verified',
      label: 'Verified',
      reason: 'Official domain / verified source',
      domains: allDomains,
    };
  }

  if (allowlisted) {
    return {
      badge: 'official',
      label: 'Official Link',
      reason: 'Official domain detected',
      domains: allDomains,
    };
  }

  return {
    badge: 'unverified',
    label: 'Unverified',
    reason: 'Not yet verified; review sources before applying',
    domains: allDomains,
  };
}

module.exports = {
  computeTrust,
  domainFromUrl,
  isAllowlistedDomain,
  ALLOWLIST_DOMAINS,
};
