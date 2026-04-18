const { nanoid } = require('nanoid');

function nowIso() {
  return new Date().toISOString();
}

function makeScheme(partial) {
  const id = partial.id || nanoid(10);
  return {
    id,
    source: {
      type: 'official',
      officialLink: partial.link || 'https://www.india.gov.in',
      verified: true,
      verifiedAt: nowIso(),
      suspicious: false,
    },
    status: 'Active',
    category: partial.category,
    theme: partial.theme, // e.g. "Farmers", "Healthcare" for Netflix row matching
    tags: [],
    title: partial.name,
    summary: partial.description,
    eligibilitySummary: partial.eligibility || 'Aadhaar Card, Permanent Residency, Bank Account required.',
    media: {
      imageUrl: partial.image,
      videoUrl: partial.video || 'https://www.youtube.com/embed/3A13vWw-m9I', // default placeholder video
    },
    stats: {
      views: Math.floor(Math.random() * 100000),
      starts: Math.floor(Math.random() * 5000),
      completes: Math.floor(Math.random() * 2000),
      ratingAvg: partial.rating || 4.5
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function seedDb() {
  const data = [
    // Theme: Agriculture & Farmers
    { name: "Pradhan Mantri Kisan Samman Nidhi", description: "Minimum income support of ₹6,000 per year for landholding farmers.", category: "Farmers", rating: 4.8, image: "https://images.unsplash.com/photo-1595841696650-612660c6d0bb?w=800", theme: "Agriculture", video: "https://www.youtube.com/embed/Pj3h-K92_kE" },
    { name: "Kisan Credit Card Scheme", description: "Timely access to agricultural credit to meet cultivation needs.", category: "Farmers", rating: 4.7, image: "https://images.unsplash.com/photo-1592982537447-6f2aa0c8cb08?w=800", theme: "Agriculture" },
    { name: "PM Fasal Bima Yojana", description: "Comprehensive crop insurance scheme from pre-sowing to post-harvest.", category: "Farmers", rating: 4.5, image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800", theme: "Agriculture" },
    { name: "PM Krishi Sinchayee Yojana", description: "Improving farm productivity and ensuring better water use efficiency.", category: "Farmers", rating: 4.4, image: "https://images.unsplash.com/photo-1586771107445-d3af9e1ed107?w=800", theme: "Agriculture" },
    { name: "National Agriculture Market (e-NAM)", description: "Pan-India electronic trading portal networking existing APMC mandis.", category: "Farmers", rating: 4.6, image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800", theme: "Agriculture" },

    // Theme: Healthcare & Wellness
    { name: "Ayushman Bharat PM-JAY", description: "Health insurance cover up to ₹5 lakhs per family per year for secondary/tertiary care.", category: "Healthcare", rating: 4.9, image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800", theme: "Healthcare", video: "https://www.youtube.com/embed/p18I12hQpC0" },
    { name: "National Health Mission", description: "Universal access to equitable, affordable, and quality healthcare services.", category: "Healthcare", rating: 4.4, image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800", theme: "Healthcare" },
    { name: "Pradhan Mantri Surakshit Matritva Abhiyan", description: "Comprehensive antenatal care for pregnant women.", category: "Healthcare", rating: 4.7, image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800", theme: "Healthcare" },
    { name: "Rashtriya Swasthya Bima Yojana", description: "Health insurance for Below Poverty Line (BPL) families in the unorganized sector.", category: "Healthcare", rating: 4.3, image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800", theme: "Healthcare" },
    { name: "Mission Indradhanush", description: "Providing life-saving vaccines to children and pregnant women.", category: "Healthcare", rating: 4.8, image: "https://images.unsplash.com/photo-1605289982774-9a6fef564df8?w=800", theme: "Healthcare" },

    // Theme: Education & Youth
    { name: "National Scholarship Portal", description: "Digital platform distributing financial aid directly to students.", category: "Education", rating: 4.7, image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800", theme: "Education", video: "https://www.youtube.com/embed/G6jWcT1W4J4" },
    { name: "Skill India Mission", description: "Vocational training and skill certification for Indian youth.", category: "Education", rating: 4.5, image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800", theme: "Education" },
    { name: "Vidyalakshmi Education Loan", description: "Single window for students to access education loans from banks.", category: "Education", rating: 4.8, image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800", theme: "Education" },
    { name: "Sarva Shiksha Abhiyan", description: "Program for universalizing elementary education across India.", category: "Education", rating: 4.6, image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800", theme: "Education" },
    { name: "Udaan Scheme (CBSE)", description: "Mentoring scheme for girls transitioning from school to engineering.", category: "Education", rating: 4.4, image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800", theme: "Education" },

    // Theme: Women Empowerment
    { name: "Beti Bachao Beti Padhao", description: "Initiative to prevent gender-biased sex selection and promote girls' education.", category: "Women", rating: 4.9, image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800", theme: "Women" },
    { name: "Pradhan Mantri Ujjwala Yojana", description: "Providing free LPG connections to women in BPL households.", category: "Women", rating: 4.8, image: "https://images.unsplash.com/photo-1504222490345-c075b6008014?w=800", theme: "Women", video: "https://www.youtube.com/embed/ZzE8N2Nl33A" },
    { name: "Sukanya Samriddhi Yojana", description: "Small savings scheme to build a fund for a girl child's education and marriage.", category: "Women", rating: 4.9, image: "https://images.unsplash.com/photo-1460904577954-8fabad262243?w=800", theme: "Women" },
    { name: "Mahila E-Haat", description: "Online marketing platform supporting women entrepreneurs and SHGs.", category: "Women", rating: 4.5, image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800", theme: "Women" },
    { name: "Stand-Up India (Women)", description: "Bank loans between ₹10 lakh and ₹1 crore for female entrepreneurs.", category: "Women", rating: 4.7, image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800", theme: "Women" },

    // Theme: Finance & Micro-Enterprise
    { name: "Pradhan Mantri Jan Dhan Yojana", description: "Ensuring access to banking, credit, insurance, and pension for all households.", category: "Finance", rating: 4.9, image: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800", theme: "Finance" },
    { name: "MUDRA Yojana (PMMY)", description: "Refinancing support offering micro-loans up to ₹10 lakhs to small enterprises.", category: "Finance", rating: 4.6, image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800", theme: "Finance" },
    { name: "Atal Pension Yojana", description: "A guaranteed pension scheme for workers in the unorganized sector.", category: "Finance", rating: 4.5, image: "https://images.unsplash.com/photo-1565514020179-026b92b64731?w=800", theme: "Finance" },
    { name: "Startup India Scheme", description: "Simplifying regulatory models and providing tax benefits to foster startups.", category: "Finance", rating: 4.8, image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800", theme: "Finance" },
    { name: "Make in India", description: "Fostering innovation and building world-class manufacturing infrastructure.", category: "Finance", rating: 4.7, image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800", theme: "Finance" },

    // Theme: General Welfare & Jobs
    { name: "MGNREGA", description: "Ensuring 100 days of guaranteed wage employment for rural households.", category: "Welfare", rating: 4.6, image: "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?w=800", theme: "Welfare" },
    { name: "Pradhan Mantri Awas Yojana (PMAY)", description: "Affordable housing for all, aiming to build pucca houses with basic amenities.", category: "Welfare", rating: 4.8, image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800", theme: "Welfare" }
  ];

  const schemes = data.map((d, index) => makeScheme({ ...d, id: `SCHEME_${index + 1}` }));

  // Generate realistic reviews
  const reviews = [];
  const names = ['Ramesh K.', 'Sunita P.', 'Amit S.', 'Priya D.', 'Vikram V.', 'Meera R.'];
  const positiveTexts = ['Very helpful and easy to apply.', 'Changed my life, highly recommend.', 'Government support was prompt.', 'Funds received directly to bank account.', 'A blessing for our family.'];
  
  schemes.forEach((s) => {
    // 3 reviews per scheme
    for (let i = 0; i < 3; i++) {
        reviews.push({
            id: nanoid(10),
            schemeId: s.id,
            rating: Math.max(3, Math.floor(Math.random() * 3) + 3), // 3 to 5 stars
            text: positiveTexts[Math.floor(Math.random() * positiveTexts.length)],
            userKey: names[Math.floor(Math.random() * names.length)],
            createdAt: nowIso()
        });
    }
  });

  return {
    meta: {
      createdAt: nowIso(),
      updatedAt: nowIso(),
      schemaVersion: 2, // Upgraded version
    },
    schemes,
    reviews,
    reports: [],
    profiles: {},
    notifications: [],
    eligibilitySessions: {},
    audit: [],
  };
}

module.exports = { seedDb };
