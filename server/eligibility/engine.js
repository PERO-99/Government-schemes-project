const { computeTrust } = require('../trust');

function clamp01(x) {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function meetsRule({ profile, rules }) {
  if (!rules) return { ok: true, missing: [] };

  const missing = [];

  // Location
  if (rules.location?.ruralOnly === true) {
    if (profile.ruralUrban && profile.ruralUrban !== 'rural') {
      return { ok: false, missing: ['Must be a rural household'] };
    }
    if (!profile.ruralUrban) missing.push('Rural/Urban not provided');
  }

  // Age
  if (typeof rules.age?.min === 'number') {
    if (typeof profile.age === 'number' && profile.age < rules.age.min) {
      return { ok: false, missing: [`Age must be at least ${rules.age.min}`] };
    }
    if (typeof profile.age !== 'number') missing.push('Age not provided');
  }

  // Occupation
  if (rules.occupation?.anyOf?.length) {
    if (profile.occupation && !rules.occupation.anyOf.includes(profile.occupation)) {
      return { ok: false, missing: ['Occupation does not match scheme requirement'] };
    }
    if (!profile.occupation) missing.push('Occupation not provided');
  }

  // Household
  if (rules.household?.bplOrSecc === true) {
    if (profile.isBPL === false) {
      return { ok: false, missing: ['BPL/SECC inclusion is required'] };
    }
    if (typeof profile.isBPL !== 'boolean') missing.push('BPL/SECC status not provided');
  }

  // Land
  if (rules.landholding?.required === true) {
    if (profile.hasLandRecords === false) {
      return { ok: false, missing: ['Land records are required'] };
    }
    if (typeof profile.hasLandRecords !== 'boolean') missing.push('Land records status not provided');
  }

  return { ok: true, missing };
}

function computeConfidence({ profile, missing, hardFail }) {
  let score = 0.9;

  // Missing key answers lowers confidence.
  score -= Math.min(0.5, (missing.length || 0) * 0.08);

  // If we have hard fail, still provide a confidence.
  if (hardFail) score = Math.min(score, 0.75);

  // If user has given more fields, slightly increase.
  const fields = Object.keys(profile || {}).filter((k) => profile[k] !== undefined && profile[k] !== null);
  score += Math.min(0.05, fields.length * 0.005);

  return clamp01(score);
}

function buildSimpleReasoning({ scheme, profile, ruleCheck, trust }) {
  const reasons = [];
  const fixes = [];

  if (!trust || trust.badge === 'unverified') {
    reasons.push('This scheme link is not yet verified. Please cross-check before applying.');
  }
  if (trust?.badge === 'suspicious') {
    reasons.push(`This scheme looks suspicious: ${trust.reason}`);
  }

  if (!ruleCheck.ok) {
    reasons.push('You do not meet one or more key requirements for this scheme.');
  }

  if (ruleCheck.missing?.length) {
    fixes.push(...ruleCheck.missing.map((m) => `Missing info: ${m}`));
  }

  if (profile.hasAadhaar === false) fixes.push('Get Aadhaar / alternative ID ready for KYC.');
  if (profile.hasBankAccount === false) fixes.push('Open a bank account for DBT (benefit transfer).');

  // Clean up duplicates
  const uniq = (arr) => Array.from(new Set(arr));

  return {
    reasons: uniq(reasons),
    fixes: uniq(fixes),
  };
}

function evaluateEligibility({ scheme, profile }) {
  const trust = computeTrust({
    officialLink: scheme.source?.officialLink,
    suspicious: scheme.source?.suspicious,
    suspiciousReason: scheme.source?.suspiciousReason,
    verified: scheme.source?.verified,
    domains: scheme.source?.domains,
  });

  const ruleCheck = meetsRule({ profile, rules: scheme.eligibilityRules });

  const hardFail = !ruleCheck.ok;
  const missing = ruleCheck.missing || [];

  let status = 'ready';
  if (hardFail) status = 'not_eligible';
  else if (missing.length > 0) status = 'needs_fix';

  // If suspicious, never show “Ready”
  if (trust.badge === 'suspicious') {
    status = 'needs_fix';
  }

  const confidence = computeConfidence({ profile, missing, hardFail });

  const reasoning = buildSimpleReasoning({ scheme, profile, ruleCheck, trust });

  return {
    status, // ready | needs_fix | not_eligible
    confidence,
    trust,
    reasons: reasoning.reasons,
    missingRequirements: reasoning.fixes,
  };
}

module.exports = {
  evaluateEligibility,
};
