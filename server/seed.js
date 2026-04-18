const { nanoid } = require('nanoid');

function nowIso() {
  return new Date().toISOString();
}

function makeScheme(partial, i) {
  const id = partial.id || String(i + 1);
  return {
    id,
    source: {
      type: 'official',
      verified: true,
      verifiedAt: nowIso(),
    },
    status: 'Active',
    category: partial.category,
    theme: partial.theme, // e.g. "Farmers", "Healthcare" for Netflix row matching
    tags: [],
    title: partial.name,
    summary: partial.description,
    eligibilitySummary: partial.eligibility || 'Aadhaar Card, Permanent Residency, Bank Account required.',
    media: {
      // Instead of generic stock photos, generate explicit graphical title posters with Saffron/Navy colors
      imageUrl: `https://placehold.co/800x400/000080/FF9933?text=${encodeURIComponent(partial.name)}`,
      videoUrl: 'https://www.youtube.com/embed/p18I12hQpC0', // Safe informational government video fallback
    },
    stats: {
      ratingAvg: partial.rating || 4.5
    },
    createdAt: nowIso(),
  };
}

function seedDb() {
  const data = [
    // Theme: Agriculture & Farmers
    { name: "PM Kisan Samman Nidhi", description: "Minimum income support of ₹6,000 per year for landholding farmers.", category: "Farmers", rating: 4.8, theme: "Agriculture" },
    { name: "Kisan Credit Card Scheme", description: "Timely access to agricultural credit to meet cultivation needs.", category: "Farmers", rating: 4.7, theme: "Agriculture" },
    { name: "PM Fasal Bima Yojana", description: "Comprehensive crop insurance scheme from pre-sowing to post-harvest.", category: "Farmers", rating: 4.5, theme: "Agriculture" },
    { name: "PM Krishi Sinchayee Yojana", description: "Improving farm productivity and ensuring better water use efficiency.", category: "Farmers", rating: 4.4, theme: "Agriculture" },
    { name: "National Agriculture Market (e-NAM)", description: "Pan-India electronic trading portal networking existing APMC mandis.", category: "Farmers", rating: 4.6, theme: "Agriculture" },

    // Theme: Healthcare & Wellness
    { name: "Ayushman Bharat PM-JAY", description: "Health insurance cover up to ₹5 lakhs per family per year for secondary/tertiary care.", category: "Healthcare", rating: 4.9, theme: "Healthcare" },
    { name: "National Health Mission", description: "Universal access to equitable, affordable, and quality healthcare services.", category: "Healthcare", rating: 4.4, theme: "Healthcare" },
    { name: "PM Surakshit Matritva Abhiyan", description: "Comprehensive antenatal care for pregnant women.", category: "Healthcare", rating: 4.7,  theme: "Healthcare" },
    { name: "Rashtriya Swasthya Bima Yojana", description: "Health insurance for Below Poverty Line (BPL) families in the unorganized sector.", category: "Healthcare", rating: 4.3, theme: "Healthcare" },
    { name: "Mission Indradhanush", description: "Providing life-saving vaccines to children and pregnant women.", category: "Healthcare", rating: 4.8, theme: "Healthcare" },

    // Theme: Education & Youth
    { name: "National Scholarship Portal", description: "Digital platform distributing financial aid directly to students.", category: "Education", rating: 4.7, theme: "Education" },
    { name: "Skill India Mission", description: "Vocational training and skill certification for Indian youth.", category: "Education", rating: 4.5, theme: "Education" },
    { name: "Vidyalakshmi Education Loan", description: "Single window for students to access education loans from banks.", category: "Education", rating: 4.8, theme: "Education" },
    { name: "Sarva Shiksha Abhiyan", description: "Program for universalizing elementary education across India.", category: "Education", rating: 4.6, theme: "Education" },
    { name: "Udaan Scheme (CBSE)", description: "Mentoring scheme for girls transitioning from school to engineering.", category: "Education", rating: 4.4, theme: "Education" },

    // Theme: Women Empowerment
    { name: "Beti Bachao Beti Padhao", description: "Initiative to prevent gender-biased sex selection and promote girls' education.", category: "Women", rating: 4.9, theme: "Women" },
    { name: "Pradhan Mantri Ujjwala Yojana", description: "Providing free LPG connections to women in BPL households.", category: "Women", rating: 4.8, theme: "Women" },
    { name: "Sukanya Samriddhi Yojana", description: "Small savings scheme to build a fund for a girl child's education and marriage.", category: "Women", rating: 4.9, theme: "Women" },
    { name: "Mahila E-Haat", description: "Online marketing platform supporting women entrepreneurs and SHGs.", category: "Women", rating: 4.5, theme: "Women" },
    { name: "Stand-Up India (Women)", description: "Bank loans between ₹10 lakh and ₹1 crore for female entrepreneurs.", category: "Women", rating: 4.7, theme: "Women" },

    // Theme: Finance & Micro-Enterprise
    { name: "PM Jan Dhan Yojana", description: "Ensuring access to banking, credit, insurance, and pension for all households.", category: "Finance", rating: 4.9, theme: "Finance" },
    { name: "MUDRA Yojana (PMMY)", description: "Refinancing support offering micro-loans up to ₹10 lakhs to small enterprises.", category: "Finance", rating: 4.6, theme: "Finance" },
    { name: "Atal Pension Yojana", description: "A guaranteed pension scheme for workers in the unorganized sector.", category: "Finance", rating: 4.5, theme: "Finance" },
    { name: "Startup India Scheme", description: "Simplifying regulatory models and providing tax benefits to foster startups.", category: "Finance", rating: 4.8, theme: "Finance" },
    { name: "Make in India", description: "Fostering innovation and building world-class manufacturing infrastructure.", category: "Finance", rating: 4.7, theme: "Finance" },

    // Theme: General Welfare & Jobs
    { name: "MGNREGA", description: "Ensuring 100 days of guaranteed wage employment for rural households.", category: "Welfare", rating: 4.6, theme: "Welfare" },
    { name: "Pradhan Mantri Awas Yojana (PMAY)", description: "Affordable housing for all, aiming to build pucca houses with basic amenities.", category: "Welfare", rating: 4.8, theme: "Welfare" }
  ];

  const schemes = data.map((d, index) => makeScheme(d, index));

  return {
    meta: {
      createdAt: nowIso(),
      updatedAt: nowIso(),
      schemaVersion: 3,
    },
    schemes,
    reviews: [],
    reports: [],
    profiles: {},
    notifications: [],
    eligibilitySessions: {},
    audit: [],
  };
}

module.exports = { seedDb };
