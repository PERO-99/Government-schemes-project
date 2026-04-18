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
      officialLink: '',
      verified: true,
      verifiedAt: nowIso(),
      suspicious: false,
      domains: [],
    },
    status: partial.status || 'Active',
    category: partial.category,
    tags: [],
    title: partial.name,
    summary: partial.description,
    eligibilitySummary: 'Eligibility checking available.',
    media: {
      imageUrl: partial.image,
      videoUrl: null,
    },
    stats: {
      views: Math.floor(Math.random() * 1000),
      starts: 0,
      completes: 0,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function seedDb() {
  const data = [
    { name: "PM Awas Yojana", description: "Affordable housing for all", category: "Welfare", rating: 4.5, image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800" },
    { name: "PM Kisan Samman Nidhi", description: "Income support for farmers", category: "Farmers", rating: 4.8, image: "https://images.unsplash.com/photo-1595841696650-612660c6d0bb?w=800" },
    { name: "Ayushman Bharat", description: "Health insurance cover up to 5 lakhs", category: "Healthcare", rating: 4.9, image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800" },
    { name: "Digital India Internship", description: "Internship opportunities for students", category: "Jobs", rating: 4.2, image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800" },
    { name: "National Scholarship Portal", description: "Financial aid for students", category: "Students", rating: 4.7, image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800" },
    { name: "Standup India", description: "Support for women and SC/ST entrepreneurs", category: "Business", rating: 4.6, image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800" },
    { name: "Skill India Mission", description: "Vocational training for youth", category: "Education", rating: 4.4, image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800" },
    { name: "Beti Bachao Beti Padhao", description: "Education and welfare for girl child", category: "Women", rating: 4.8, image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800" },
    { name: "MUDRA Yojana", description: "Microfinance for small businesses", category: "Finance", rating: 4.3, image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800" },
    { name: "MGNREGA", description: "100 days of guaranteed wage employment", category: "Jobs", rating: 4.5, image: "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?w=800" },
    { name: "Kisan Credit Card", description: "Credit support for farmers", category: "Farmers", rating: 4.7, image: "https://images.unsplash.com/photo-1592982537447-6f2aa0c8cb08?w=800" },
    { name: "National Health Mission", description: "Universal access to equitable, affordable healthcare", category: "Healthcare", rating: 4.4, image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800" },
    { name: "Pradhan Mantri Jan Dhan Yojana", description: "Financial inclusion for all", category: "Finance", rating: 4.9, image: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800" },
    { name: "Startup India", description: "Boost entrepreneurship and startups", category: "Business", rating: 4.8, image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800" },
    { name: "Ujjwala Yojana", description: "LPG connections to women of BPL families", category: "Women", rating: 4.7, image: "https://images.unsplash.com/photo-1504222490345-c075b6008014?w=800" },
    { name: "Deen Dayal Upadhyaya Grameen Kaushalya Yojana", description: "Skill training for rural youth", category: "Education", rating: 4.5, image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800" },
    { name: "PMEGP", description: "Credit linked subsidy program to generate employment", category: "Jobs", rating: 4.6, image: "https://images.unsplash.com/photo-1664575602554-2087b04935a5?w=800" },
    { name: "Pradhan Mantri Krishi Sinchayee Yojana", description: "Improving farm productivity and water use", category: "Farmers", rating: 4.4, image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800" },
    { name: "Rashtriya Swasthya Bima Yojana", description: "Health insurance for unorganized sector workers", category: "Healthcare", rating: 4.3, image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800" },
    { name: "Vidyalakshmi Education Loan", description: "Single window for students to access education loans", category: "Students", rating: 4.8, image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800" },
    { name: "Sukanaya Samriddhi Yojana", description: "Savings scheme for girl child", category: "Women", rating: 4.9, image: "https://images.unsplash.com/photo-1460904577954-8fabad262243?w=800" },
    { name: "Make in India", description: "Encouraging companies to manufacture in India", category: "Business", rating: 4.5, image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800" },
    { name: "Atal Pension Yojana", description: "Pension scheme for unorganized sector", category: "Finance", rating: 4.6, image: "https://images.unsplash.com/photo-1565514020179-026b92b64731?w=800" },
    { name: "Sarva Shiksha Abhiyan", description: "Universalizing elementary education", category: "Education", rating: 4.7, image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800" },
    { name: "National Rural Livelihood Mission", description: "Reducing rural poverty through self-employment", category: "Welfare", rating: 4.6, image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800" },
  ];

  const schemes = data.map((d, index) => makeScheme({ ...d, id: String(index + 1) }));

  const reviews = [];
  data.forEach((d, index) => {
      // Create a fake reviews average to match rating
      reviews.push({ id: nanoid(10), schemeId: String(index + 1), rating: d.rating, text: "Good", userKey: "sys" });
  });

  return {
    meta: {
      createdAt: nowIso(),
      updatedAt: nowIso(),
      schemaVersion: 1,
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
