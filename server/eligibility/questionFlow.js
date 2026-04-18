const { z } = require('zod');

const ProfileSchema = z.object({
  consentToSave: z.boolean().optional(),
  language: z.string().optional(),
  simpleLanguage: z.boolean().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  ruralUrban: z.enum(['rural', 'urban']).optional(),
  age: z.number().int().min(0).max(120).optional(),
  gender: z.enum(['female', 'male', 'other']).optional(),
  category: z.enum(['sc', 'st', 'obc', 'general']).optional(),
  annualIncomeINR: z.number().int().min(0).optional(),
  occupation: z.enum(['farmer', 'student', 'self_employed', 'wage_worker', 'unemployed', 'other']).optional(),
  hasLandRecords: z.boolean().optional(),
  hasAadhaar: z.boolean().optional(),
  hasBankAccount: z.boolean().optional(),
  hasRationCard: z.boolean().optional(),
  isBPL: z.boolean().optional(),
});

function baseQuestions() {
  return [
    {
      id: 'ruralUrban',
      type: 'single',
      i18nKey: 'q.ruralUrban',
      title: 'Where do you live?',
      helper: 'This helps match rural/urban schemes.',
      options: [
        { label: 'Rural (Gaon)', value: 'rural' },
        { label: 'Urban (Shehar)', value: 'urban' },
      ],
    },
    {
      id: 'state',
      type: 'text',
      i18nKey: 'q.state',
      title: 'Which state are you in?',
      helper: 'Example: Bihar, UP, Tamil Nadu',
      placeholder: 'Type your state',
    },
    {
      id: 'annualIncomeINR',
      type: 'single',
      i18nKey: 'q.income',
      title: 'What is your annual household income (approx)?',
      helper: 'Schemes often have income limits.',
      options: [
        { label: 'Up to ₹1,00,000', value: 100000 },
        { label: '₹1,00,001 - ₹2,50,000', value: 250000 },
        { label: '₹2,50,001 - ₹6,00,000', value: 600000 },
        { label: 'Above ₹6,00,000', value: 9999999 },
      ],
    },
    {
      id: 'category',
      type: 'single',
      i18nKey: 'q.category',
      title: 'Which category do you belong to?',
      helper: 'Only for eligibility checks; not shared without your consent.',
      options: [
        { label: 'SC', value: 'sc' },
        { label: 'ST', value: 'st' },
        { label: 'OBC', value: 'obc' },
        { label: 'General', value: 'general' },
      ],
    },
    {
      id: 'age',
      type: 'single',
      i18nKey: 'q.age',
      title: 'What is your age group?',
      helper: 'Some schemes have age limits.',
      options: [
        { label: 'Under 18', value: 17 },
        { label: '18 - 24', value: 20 },
        { label: '25 - 59', value: 35 },
        { label: '60+', value: 60 },
      ],
    },
  ];
}

function schemeSpecificQuestions(scheme) {
  const qs = [];

  if (scheme.category === 'Agriculture') {
    qs.push({
      id: 'occupation',
      type: 'single',
      i18nKey: 'q.occupation',
      title: 'What do you do mainly?',
      helper: 'For farmer-related schemes.',
      options: [
        { label: 'Farmer', value: 'farmer' },
        { label: 'Wage worker', value: 'wage_worker' },
        { label: 'Self-employed', value: 'self_employed' },
        { label: 'Other', value: 'other' },
      ],
    });
    qs.push({
      id: 'hasLandRecords',
      type: 'single',
      i18nKey: 'q.land',
      title: 'Do you have land records (Khasra/Khatauni) available?',
      helper: 'Many farmer schemes need land records.',
      options: [
        { label: 'Yes', value: true },
        { label: 'No / Not sure', value: false },
      ],
    });
  }

  if (scheme.category === 'Healthcare') {
    qs.push({
      id: 'isBPL',
      type: 'single',
      i18nKey: 'q.bpl',
      title: 'Is your family BPL / included in SECC list?',
      helper: 'PM-JAY eligibility often depends on this.',
      options: [
        { label: 'Yes', value: true },
        { label: 'No / Not sure', value: false },
      ],
    });
    qs.push({
      id: 'hasRationCard',
      type: 'single',
      i18nKey: 'q.ration',
      title: 'Do you have a ration card?',
      helper: 'May help in verification (optional).',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    });
  }

  if (scheme.category === 'Housing') {
    qs.push({
      id: 'ruralUrban',
      type: 'single',
      i18nKey: 'q.ruralUrban',
      title: 'Where do you live?',
      helper: 'PMAY-G is for rural households.',
      options: [
        { label: 'Rural (Gaon)', value: 'rural' },
        { label: 'Urban (Shehar)', value: 'urban' },
      ],
    });
  }

  // Basic KYC readiness (helps checklist & “needs fix”)
  qs.push({
    id: 'hasAadhaar',
    type: 'single',
    i18nKey: 'q.aadhaar',
    title: 'Do you have Aadhaar?',
    helper: 'Often required; you can still proceed if you do not have it yet.',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
  });
  qs.push({
    id: 'hasBankAccount',
    type: 'single',
    i18nKey: 'q.bank',
    title: 'Do you have a bank account for DBT (Direct Benefit Transfer)?',
    helper: 'Most benefits are sent to a bank account.',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
  });

  return qs;
}

function buildQuestionList({ scheme }) {
  // Keep it short, mobile-friendly.
  const base = baseQuestions();
  const specific = schemeSpecificQuestions(scheme);

  // De-duplicate by id; scheme-specific should override base.
  const byId = new Map();
  for (const q of base) byId.set(q.id, q);
  for (const q of specific) byId.set(q.id, q);

  return Array.from(byId.values());
}

module.exports = {
  ProfileSchema,
  buildQuestionList,
};
