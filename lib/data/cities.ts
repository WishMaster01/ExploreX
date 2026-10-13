export type CityPlace = {
  name: string;
  category: string;
  description: string;
  estimatedCost: string;
  visitTime: string;
  bestTime: string;
  image?: string;
  address?: string;
  actionIcon?: "bookmark" | "camera" | "ticket" | "shop" | "landmark";
};

export type ExploreCity = {
  slug: string;
  name: string;
  country: string;
  flag: string;
  region: string;
  tagline: string;
  summary: string;
  image: string;
  gallery: string[];
  currency: string;
  language: string;
  bestSeason: string;
  idealDuration: string;
  estimatedDailyCost: string;
  safetyNote: string;
  localTransit: string;
  weather: {
    temp: string;
    condition: string;
  };
  coordinates?: string;
  featuredLandmark: {
    name: string;
    address: string;
  };
  places: CityPlace[];
  foodHighlights: string[];
  travelTips: string[];
  activities?: string[];
  safetySteps?: string[];
};

const curatedCities: ExploreCity[] = [
  {
    slug: "saint-petersburg",
    name: "Saint Petersburg",
    country: "Russia",
    flag: "🇷🇺",
    region: "Europe",
    tagline:
      "The cultural capital of Russia. Discover magnificent palaces, romantic canals, rich history, and timeless architecture.",
    summary:
      "Saint Petersburg is a city of imperial grandeur, classical arts, and luminous white nights. Golden spires, baroque facades, and drawbridges over the Neva River evoke a majestic romance unmatched in northern Europe.",
    image:
      "https://images.unsplash.com/photo-1548625361-1acdedf84742?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1556610961-2fecc5927173?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Russian Ruble (RUB)",
    language: "Russian",
    bestSeason: "May–September (White Nights in June)",
    idealDuration: "4–6 days",
    estimatedDailyCost: "$90–$180 per person",
    safetyNote:
      "Central tourist avenues are well patrolled; stay mindful of personal belongings in crowded transit hubs and drawbridge gatherings.",
    localTransit:
      "Metro, canal boats, trolleybuses, and scenic pedestrian boulevards",
    weather: {
      temp: "12°C",
      condition: "Partly Cloudy",
    },
    coordinates: "59.9343° N, 30.3351° E",
    featuredLandmark: {
      name: "Isaac's Cathedral",
      address: "St. Isaac's Square, Saint Petersburg",
    },
    places: [
      {
        name: "Hermitage Museum",
        category: "World-famous art museum",
        description:
          "One of the world's largest museums, housed in the opulent Winter Palace of the Russian Tsars.",
        estimatedCost: "About $12",
        visitTime: "4–5 hours",
        bestTime: "Morning opening",
        image:
          "https://images.unsplash.com/photo-1548625361-1acdedf84742?w=800&auto=format&fit=crop&q=80",
        address: "Palace Square",
        actionIcon: "bookmark",
      },
      {
        name: "Church of the Savior on Spilled Blood",
        category: "Iconic Russian architecture",
        description:
          "Breathtaking medieval Russian style church adorned with intricate multicolored onion domes and mosaics.",
        estimatedCost: "About $7",
        visitTime: "1.5–2 hours",
        bestTime: "Midday sunlight",
        image:
          "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&auto=format&fit=crop&q=80",
        address: "Griboedov Canal",
        actionIcon: "camera",
      },
      {
        name: "Palace Bridge",
        category: "Bascule Bridge",
        description:
          "Famous bridge that opens nightly during navigational season against the backdrop of the Peter and Paul Fortress.",
        estimatedCost: "Free",
        visitTime: "1 hour",
        bestTime: "Night time (1:10 AM opening)",
        image:
          "https://images.unsplash.com/photo-1556610961-2fecc5927173?w=800&auto=format&fit=crop&q=80",
        address: "Neva River",
        actionIcon: "bookmark",
      },
      {
        name: "Nevsky Prospekt",
        category: "Main Avenue",
        description:
          "The historical artery of the city, bustling with literary cafes, bookshops, bridges, and imperial architecture.",
        estimatedCost: "Free",
        visitTime: "2–3 hours",
        bestTime: "Afternoon to evening",
        image:
          "https://images.unsplash.com/photo-1512495039889-52a3b799c9bc?w=800&auto=format&fit=crop&q=80",
        address: "Tsentralny District",
        actionIcon: "shop",
      },
      {
        name: "Peter and Paul Fortress",
        category: "Historic Fortress",
        description:
          "The original citadel founded by Peter the Great in 1703, housing the imperial tombs of Romanov Tsars.",
        estimatedCost: "Free grounds; $8 cathedral",
        visitTime: "2–3 hours",
        bestTime: "Noon cannon shot",
        image:
          "https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?w=800&auto=format&fit=crop&q=80",
        address: "Zayachy Island",
        actionIcon: "landmark",
      },
    ],
    foodHighlights: [
      "Pyshki donuts at historic bakeries",
      "Beef Stroganoff in grand halls",
      "Borscht with garlic pampushky",
      "Blini with caviar and berries",
    ],
    travelTips: [
      "Book Hermitage tickets online to skip line queues.",
      "Watch the illuminated drawbridges open from a canal cruise.",
      "Visit during June to witness the magical White Nights.",
    ],
  },
  {
    slug: "rome",
    name: "Rome",
    country: "Italy",
    flag: "🇮🇹",
    region: "Europe",
    tagline:
      "Eternal City of ancient ruins, romantic piazzas, trattorias, and layered history",
    summary:
      "Rome rewards smart route sequencing because ancient ruins, Baroque fountains, renaissance palaces, and local trattorias sit in dense, walkable clusters bathed in golden sunset light.",
    image:
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Euro (EUR)",
    language: "Italian",
    bestSeason: "April–May and September–October",
    idealDuration: "4–6 days",
    estimatedDailyCost: "€120–€230 per person",
    safetyNote:
      "Generally safe in central areas; keep bags zipped near Termini and crowded metro cars.",
    localTransit:
      "Metro, historic trams, buses, and cobblestone walking routes",
    weather: {
      temp: "22°C",
      condition: "Golden Sunset",
    },
    coordinates: "41.8902° N, 12.4922° E",
    featuredLandmark: {
      name: "Colosseum",
      address: "Piazza del Colosseo, 1, 00184 Roma RM, Italy",
    },
    places: [
      {
        name: "Colosseum",
        category: "Ancient Amphitheatre",
        description:
          "An iconic symbol of Rome and architectural marvel of the ancient world. Built in 80 AD, it once hosted gladiator battles and grand spectacles.",
        estimatedCost: "About €18",
        visitTime: "2–3 hours",
        bestTime: "Golden hour sunset",
        image:
          "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80",
        address: "Piazza del Colosseo, 1",
        actionIcon: "landmark",
      },
      {
        name: "Trevi Fountain",
        category: "Baroque Monument",
        description:
          "Rome's most famous fountain where travelers toss coins over their left shoulder to guarantee their return to the Eternal City.",
        estimatedCost: "Free",
        visitTime: "1 hour",
        bestTime: "Early morning or late evening",
        image:
          "https://images.unsplash.com/photo-1525874684015-58379d421a52?w=800&auto=format&fit=crop&q=80",
        address: "Piazza di Trevi",
        actionIcon: "camera",
      },
      {
        name: "St. Peter's Basilica",
        category: "Papal Enclave",
        description:
          "Renaissance masterpiece designed by Michelangelo and Bernini, crowning the heart of Vatican City.",
        estimatedCost: "Free (Dome €8–€10)",
        visitTime: "2–3 hours",
        bestTime: "Early morning 8:00 AM",
        image:
          "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800&auto=format&fit=crop&q=80",
        address: "Vatican City",
        actionIcon: "bookmark",
      },
      {
        name: "Pantheon",
        category: "Ancient Temple",
        description:
          "Best preserved Roman monument with its colossal unreinforced concrete dome and mystical central oculus open to the sky.",
        estimatedCost: "About €5",
        visitTime: "45 minutes",
        bestTime: "Midday when sunbeam pierces oculus",
        image:
          "https://images.unsplash.com/photo-1542820229-081e0c12af0b?w=800&auto=format&fit=crop&q=80",
        address: "Piazza della Rotonda",
        actionIcon: "landmark",
      },
      {
        name: "Spanish Steps",
        category: "Historic Staircase",
        description:
          "Monumental stairway of 135 steps climbing a steep slope between the Piazza di Spagna and Trinità dei Monti.",
        estimatedCost: "Free",
        visitTime: "1 hour",
        bestTime: "Sunset blue hour",
        image:
          "https://images.unsplash.com/photo-1588614959060-4d144f28b207?w=800&auto=format&fit=crop&q=80",
        address: "Piazza di Spagna",
        actionIcon: "camera",
      },
    ],
    foodHighlights: [
      "Authentic Carbonara & Cacio e Pepe",
      "Crispy Roman Thin-crust Pizza",
      "Artisanal Pistachio Gelato",
      "Aperitivo spritz in Trastevere",
    ],
    travelTips: [
      "Book Colosseum and Vatican entry weeks ahead.",
      "Fill reusable water bottles at Rome's historic 'nasoni' fountains.",
      "Wear comfortable sneakers for historic cobblestone walking.",
    ],
  },
  {
    slug: "santorini",
    name: "Santorini",
    country: "Greece",
    flag: "🇬🇷",
    region: "Europe",
    tagline:
      "Whitewashed cliffside villages, blue domes, and world-renowned Aegean sunsets",
    summary:
      "Perched high on caldera cliffs above the Aegean Sea, Santorini offers iconic whitewashed architecture, volcanic vineyards, and unforgettable golden-hour vistas.",
    image:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507034589631-9433cc6bc453?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Euro (EUR)",
    language: "Greek & English",
    bestSeason: "May–October",
    idealDuration: "3–5 days",
    estimatedDailyCost: "€150–€300 per person",
    safetyNote:
      "Very safe island; watch steep steps and wear grippy sandals on caldera paths.",
    localTransit:
      "Local KTEL buses, rental quad bikes, and scenic clifftop trails",
    weather: {
      temp: "25°C",
      condition: "Sunny Breeze",
    },
    coordinates: "36.3932° N, 25.4615° E",
    featuredLandmark: {
      name: "Oia Castle Viewpoint",
      address: "Oia Village, Santorini 84702, Greece",
    },
    places: [
      {
        name: "Oia Blue Domes",
        category: "Iconic Viewpoint",
        description:
          "Postcard-perfect Greek Orthodox blue dome churches overlooking the deep azure caldera.",
        estimatedCost: "Free",
        visitTime: "2 hours",
        bestTime: "Early sunrise before crowds",
        image:
          "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&auto=format&fit=crop&q=80",
        address: "Oia Clifftops",
        actionIcon: "camera",
      },
      {
        name: "Fira to Oia Caldera Hike",
        category: "Scenic Trail",
        description:
          "Unforgettable 10km clifftop hike providing continuous panoramic views across the volcanic rim.",
        estimatedCost: "Free",
        visitTime: "3–4 hours",
        bestTime: "Morning before noon heat",
        image:
          "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&auto=format&fit=crop&q=80",
        address: "Caldera Ridge",
        actionIcon: "landmark",
      },
      {
        name: "Red Beach (Akrotiri)",
        category: "Volcanic Beach",
        description:
          "Dramatic red volcanic cliffs plunging into crystal clear Aegean waters near prehistoric ruins.",
        estimatedCost: "Free",
        visitTime: "2 hours",
        bestTime: "Late morning",
        image:
          "https://images.unsplash.com/photo-1507034589631-9433cc6bc453?w=800&auto=format&fit=crop&q=80",
        address: "Akrotiri",
        actionIcon: "bookmark",
      },
    ],
    foodHighlights: [
      "Fresh Aegean grilled octopus",
      "Fava santorinis puree",
      "Tomatokeftedes (tomato fritters)",
      "Assyrtiko crisp white wine",
    ],
    travelTips: [
      "Stay in Imerovigli for sunset views with fewer crowds than Oia.",
      "Catch a sunset catamaran cruise around the caldera.",
      "Wear sturdy flat footwear for stone steps.",
    ],
  },
  {
    slug: "bali",
    name: "Bali",
    country: "Indonesia",
    flag: "🇮🇩",
    region: "Asia",
    tagline:
      "Island of the Gods, emerald rice terraces, spiritual temples, and surf coasts",
    summary:
      "Bali harmonizes lush jungle sanctuaries, cliffside ocean temples, vibrant spiritual traditions, and world-class culinary wellness retreats.",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Indonesian Rupiah (IDR)",
    language: "Indonesian & Balinese (English widely spoken)",
    bestSeason: "April–October (Dry Season)",
    idealDuration: "6–10 days",
    estimatedDailyCost: "$45–$120 per person",
    safetyNote:
      "Low violent-crime rate; be cautious when riding scooters without experience.",
    localTransit:
      "Private car drivers, Grab/Gojek ride hailing, scooter rentals",
    weather: {
      temp: "29°C",
      condition: "Tropical Warmth",
    },
    coordinates: "8.3405° S, 115.0920° E",
    featuredLandmark: {
      name: "Uluwatu Clifftop Temple",
      address: "Pecatu, South Kuta, Badung Regency, Bali",
    },
    places: [
      {
        name: "Tegalalang Rice Terraces",
        category: "Natural Wonder",
        description:
          "Iconic emerald green tiered paddy fields using centuries-old traditional Balinese subak irrigation.",
        estimatedCost: "$3 entry",
        visitTime: "2 hours",
        bestTime: "Sunrise 6:30 AM",
        image:
          "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&auto=format&fit=crop&q=80",
        address: "Ubud, Gianyar",
        actionIcon: "camera",
      },
      {
        name: "Uluwatu Temple & Kecak Dance",
        category: "Spiritual Culture",
        description:
          "Sea temple perched on a dramatic 70-meter cliff facing the Indian Ocean with mesmerizing sunset fire dance.",
        estimatedCost: "$10 entry & dance",
        visitTime: "3 hours",
        bestTime: "Sunset 5:30 PM",
        image:
          "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&auto=format&fit=crop&q=80",
        address: "Uluwatu Cliffs",
        actionIcon: "landmark",
      },
      {
        name: "Nusa Penida Kelingking Beach",
        category: "Coastal Adventure",
        description:
          "Spectacular T-Rex shaped cliff towering over untouched turquoise waters and white sand beach.",
        estimatedCost: "$25 boat & entry",
        visitTime: "Day trip",
        bestTime: "Morning",
        image:
          "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80",
        address: "Nusa Penida Island",
        actionIcon: "bookmark",
      },
    ],
    foodHighlights: [
      "Nasi Campur Bali with sambal matah",
      "Babi Guling roast suckling pig",
      "Fresh coconut water & dragonfruit smoothie bowls",
      "Jimbaran beach grilled seafood",
    ],
    travelTips: [
      "Hire a reputable private driver for day tours ($40/day).",
      "Respect temple dress codes (sarongs provided at entrances).",
      "Divide stays between Ubud jungle and Uluwatu coast.",
    ],
  },
  {
    slug: "cape-town",
    name: "Cape Town",
    country: "South Africa",
    flag: "🇿🇦",
    region: "Africa",
    tagline:
      "Where dramatic mountains meet two oceans, world-class wine, and coastal wildlife",
    summary:
      "Few cities rival Cape Town's breathtaking geography: towering Table Mountain stands guard between Atlantic surf beaches, historic botanical gardens, and dramatic peninsulas.",
    image:
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "South African Rand (ZAR)",
    language: "English, Afrikaans, and Xhosa",
    bestSeason: "November–March (Summer & Beach weather)",
    idealDuration: "5–7 days",
    estimatedDailyCost: "$80–$170 per person",
    safetyNote:
      "Stick to well-lit busy areas; use registered Uber ride-hailing for evening dining.",
    localTransit: "MyCiTi buses, Uber, and coastal rental cars",
    weather: {
      temp: "24°C",
      condition: "Clear Coast",
    },
    coordinates: "33.9249° S, 18.4241° E",
    featuredLandmark: {
      name: "Table Mountain Aerial Cableway",
      address: "Tafelberg Rd, Gardens, Cape Town, 8001",
    },
    places: [
      {
        name: "Table Mountain Summit",
        category: "Natural Wonder",
        description:
          "Flat-topped mountain providing 360-degree views of Cape Town, Table Bay, and the Atlantic seaboard.",
        estimatedCost: "About $22 cableway",
        visitTime: "2–3 hours",
        bestTime: "Morning on clear days",
        image:
          "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&auto=format&fit=crop&q=80",
        address: "Tafelberg Road",
        actionIcon: "landmark",
      },
      {
        name: "Boulders Beach Penguin Colony",
        category: "Wildlife Sanctuary",
        description:
          "Sheltered coastal cove home to a famous protected breeding colony of African penguins.",
        estimatedCost: "About $10",
        visitTime: "1.5 hours",
        bestTime: "Late afternoon",
        image:
          "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&auto=format&fit=crop&q=80",
        address: "Simon's Town",
        actionIcon: "camera",
      },
      {
        name: "Cape of Good Hope",
        category: "Dramatic Peninsula",
        description:
          "Rugged cliffs, crashing waves, and hiking trails at the southwestern tip of the African continent.",
        estimatedCost: "About $20 entry",
        visitTime: "Half day",
        bestTime: "Midday sunshine",
        image:
          "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=800&auto=format&fit=crop&q=80",
        address: "Cape Point National Park",
        actionIcon: "bookmark",
      },
    ],
    foodHighlights: [
      "Cape Malay bobotie & samosas",
      "Fresh Atlantic kingklip and oysters",
      "Braai barbecued meats",
      "Stellenbosch Pinotage wine tastings",
    ],
    travelTips: [
      "Check Table Mountain webcams before heading up to ensure cloud-free views.",
      "Take Chapman's Peak Drive for one of the world's greatest scenic road trips.",
      "Book Kirstenbosch sunset concert picnics in summer.",
    ],
  },
  {
    slug: "paris",
    name: "Paris",
    country: "France",
    flag: "🇫🇷",
    region: "Europe",
    tagline: "Art, bakeries, river walks, and cinematic landmarks",
    summary:
      "Paris combines major museums with walkable neighborhoods, gardens, markets, and late-evening river views. Grouping sights by arrondissement keeps travel time realistic.",
    image:
      "https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Euro (EUR)",
    language: "French",
    bestSeason: "April–June and September–October",
    idealDuration: "4–6 days",
    estimatedDailyCost: "€140–€260 per person",
    safetyNote:
      "Generally safe in visitor districts; watch for pickpockets around stations and crowded landmarks.",
    localTransit: "Metro, RER, buses, and extensive walking routes",
    weather: {
      temp: "18°C",
      condition: "Pleasant & Mild",
    },
    coordinates: "48.8566° N, 2.3522° E",
    featuredLandmark: {
      name: "Eiffel Tower",
      address: "Champ de Mars, 5 Av. Anatole France, 75007 Paris",
    },
    places: [
      {
        name: "Louvre Museum",
        category: "World Art Museum",
        description:
          "A world-scale collection best approached with a preselected gallery route.",
        estimatedCost: "€22",
        visitTime: "3–4 hours",
        bestTime: "Opening time",
        image:
          "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&auto=format&fit=crop&q=80",
        address: "Rue de Rivoli",
        actionIcon: "bookmark",
      },
      {
        name: "Eiffel Tower & Champ de Mars",
        category: "Historic Landmark",
        description:
          "Tower viewpoints and riverside lawns with excellent sunset access.",
        estimatedCost: "Free–€36",
        visitTime: "2–3 hours",
        bestTime: "Late afternoon",
        image:
          "https://images.unsplash.com/photo-1431274172761-fca41d930114?w=800&auto=format&fit=crop&q=80",
        address: "Champ de Mars",
        actionIcon: "camera",
      },
      {
        name: "Montmartre & Sacré-Cœur",
        category: "Historic Neighborhood",
        description:
          "Hillside streets, Sacré-Cœur basilica, artists' studios, cafes, and city viewpoints.",
        estimatedCost: "Free",
        visitTime: "2–4 hours",
        bestTime: "Morning",
        image:
          "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80",
        address: "18th Arrondissement",
        actionIcon: "landmark",
      },
    ],
    foodHighlights: [
      "Warm croissants & baguettes",
      "Classic duck confit bistros",
      "Artisanal cheese boards",
      "Pastries from Pierre Hermé",
    ],
    travelTips: [
      "Reserve major museums before arrival.",
      "Plan each day around adjacent arrondissements.",
      "Keep a contactless card plus a small amount of cash.",
    ],
  },
  {
    slug: "tokyo",
    name: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    region: "Asia",
    tagline: "Neon districts, temples, food alleys, and calm gardens",
    summary:
      "Tokyo rewards district-based planning. One rail corridor can connect historic temples, design neighborhoods, food markets, and evening viewpoints without excessive backtracking.",
    image:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Japanese yen (JPY)",
    language: "Japanese",
    bestSeason: "March–May and October–November",
    idealDuration: "5–8 days",
    estimatedDailyCost: "¥15,000–¥30,000 per person",
    safetyNote:
      "Low violent-crime risk; follow late-night transit times and local etiquette.",
    localTransit: "JR trains, metro lines, buses, and walking",
    weather: {
      temp: "20°C",
      condition: "Clear Sky",
    },
    coordinates: "35.6762° N, 139.6503° E",
    featuredLandmark: {
      name: "Sensō-ji Temple",
      address: "2 Chome-3-1 Asakusa, Taito City, Tokyo",
    },
    places: [
      {
        name: "Sensō-ji",
        category: "Historic Temple",
        description:
          "Historic Asakusa temple complex with traditional shopping streets and incense burners.",
        estimatedCost: "Free",
        visitTime: "1–2 hours",
        bestTime: "Early morning",
        image:
          "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80",
        address: "Asakusa",
        actionIcon: "landmark",
      },
      {
        name: "Shibuya Crossing & Sky",
        category: "Neon Metropolis",
        description:
          "The world's busiest pedestrian crossing with futuristic high-altitude observation decks.",
        estimatedCost: "Free–¥2,500",
        visitTime: "2–4 hours",
        bestTime: "Twilight & evening",
        image:
          "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&auto=format&fit=crop&q=80",
        address: "Shibuya",
        actionIcon: "camera",
      },
      {
        name: "Meiji Shrine & Harajuku",
        category: "Serene Forest Sanctuary",
        description:
          "Forested shrine grounds beside Harajuku youth culture and Omotesando architectural fashion.",
        estimatedCost: "Free",
        visitTime: "2 hours",
        bestTime: "Morning",
        image:
          "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=800&auto=format&fit=crop&q=80",
        address: "Shibuya City",
        actionIcon: "bookmark",
      },
    ],
    foodHighlights: [
      "Omakase sushi counters",
      "Rich Tonkotsu ramen",
      "Crispy Yakitori skewers",
      "Matcha parfaits & Wagashi",
    ],
    travelTips: [
      "Use a rechargeable Suica/Pasmo transit card.",
      "Group stops along the same rail corridor.",
      "Book limited-capacity digital museums early.",
    ],
  },
  {
    slug: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    region: "Middle East",
    tagline: "Architecture, beaches, desert evenings, and modern luxury",
    summary:
      "Dubai spans long distances, so itineraries should group Downtown, Old Dubai, Marina, and desert activities rather than repeatedly crossing the city.",
    image:
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "UAE dirham (AED)",
    language: "Arabic and English",
    bestSeason: "November–March",
    idealDuration: "3–5 days",
    estimatedDailyCost: "AED 500–1,100 per person",
    safetyNote:
      "Low street-crime risk; observe local laws, dress expectations, and heat precautions.",
    localTransit: "Metro, tram, buses, taxis, and ride-hailing",
    weather: {
      temp: "28°C",
      condition: "Sunny Gold",
    },
    coordinates: "25.2048° N, 55.2708° E",
    featuredLandmark: {
      name: "Burj Khalifa",
      address: "1 Sheikh Mohammed bin Rashid Blvd, Downtown Dubai",
    },
    places: [
      {
        name: "Burj Khalifa Observation Deck",
        category: "Skyline Viewpoint",
        description:
          "Timed observation decks atop the world's tallest skyscraper overlooking Downtown Dubai.",
        estimatedCost: "AED 169–459",
        visitTime: "2 hours",
        bestTime: "Sunset golden hour",
        image:
          "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&auto=format&fit=crop&q=80",
        address: "Downtown Dubai",
        actionIcon: "landmark",
      },
      {
        name: "Desert Conservation Safari",
        category: "Desert Adventure",
        description:
          "Red sand dune bashing, camel treks, starlit camps, and Bedouin cultural banquets.",
        estimatedCost: "AED 250–700",
        visitTime: "6 hours",
        bestTime: "Afternoon to night",
        image:
          "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=800&auto=format&fit=crop&q=80",
        address: "Dubai Desert Conservation Reserve",
        actionIcon: "camera",
      },
    ],
    foodHighlights: [
      "Emirati Machboos",
      "Levantine mezze & shawarma",
      "Creek-side Karak tea",
      "Global Michelin-star dining",
    ],
    travelTips: [
      "Avoid outdoor-heavy midday plans in hot months.",
      "Use the Metro for Downtown and Marina corridors.",
      "Check cultural guidance before arrival.",
    ],
  },
  {
    slug: "new-york",
    name: "New York City",
    country: "United States",
    flag: "🇺🇸",
    region: "Americas",
    tagline: "Skyline energy, food neighborhoods, parks, and world-class shows",
    summary:
      "New York works best when Manhattan and outer-borough neighborhoods are treated as separate clusters. Subway-aware sequencing prevents long cross-city transfers.",
    image:
      "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "US dollar (USD)",
    language: "English",
    bestSeason: "April–June and September–November",
    idealDuration: "4–7 days",
    estimatedDailyCost: "$190–$350 per person",
    safetyNote:
      "Use normal big-city precautions, stay aware late at night, and use official transit.",
    localTransit: "Subway, buses, NYC ferries, and walking",
    weather: {
      temp: "19°C",
      condition: "Crisp City Air",
    },
    coordinates: "40.7128° N, 74.0060° W",
    featuredLandmark: {
      name: "Empire State Building",
      address: "20 W 34th St., New York, NY 10001",
    },
    places: [
      {
        name: "Central Park",
        category: "Urban Oasis",
        description:
          "Expansive green sanctuary with lakes, Belvedere Castle, and peaceful walking pathways.",
        estimatedCost: "Free",
        visitTime: "3 hours",
        bestTime: "Morning",
        image:
          "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=800&auto=format&fit=crop&q=80",
        address: "Manhattan",
        actionIcon: "landmark",
      },
      {
        name: "Brooklyn Bridge & DUMBO",
        category: "Iconic Bridge Walk",
        description:
          "Suspension bridge promenade connecting lower Manhattan to stunning waterfront skyline parks.",
        estimatedCost: "Free",
        visitTime: "2 hours",
        bestTime: "Sunrise or sunset",
        image:
          "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop&q=80",
        address: "Brooklyn Bridge",
        actionIcon: "camera",
      },
    ],
    foodHighlights: [
      "Crispy NY style pizza slices",
      "Katz's pastrami sandwiches",
      "Fresh bagels with lox",
      "Chinatown soup dumplings",
    ],
    travelTips: [
      "Tap credit card or phone directly at subway turnstiles.",
      "Cluster plans above or below Midtown.",
      "Walk the High Line on weekday mornings.",
    ],
  },
  {
    slug: "sydney",
    name: "Sydney",
    country: "Australia",
    flag: "🇦🇺",
    region: "Oceania",
    tagline: "Harbor views, ocean pools, coastal walks, and sun-soaked dining",
    summary:
      "Sydney combines ferries, rail, beaches, and coastal trails. Weather and daylight are important when sequencing harbor viewpoints and outdoor activities.",
    image:
      "https://images.unsplash.com/photo-1530276371031-2511efff9d5a?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1582076197950-7a1dcdd1e07f?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Australian dollar (AUD)",
    language: "English",
    bestSeason: "September–November and March–May",
    idealDuration: "4–6 days",
    estimatedDailyCost: "A$180–A$320 per person",
    safetyNote:
      "Generally safe; use beach flags, sun protection, and current coastal guidance.",
    localTransit: "Trains, light rail, scenic harbor ferries, and walking",
    weather: {
      temp: "23°C",
      condition: "Coastal Breeze",
    },
    coordinates: "33.8688° S, 151.2093° E",
    featuredLandmark: {
      name: "Sydney Opera House",
      address: "Bennelong Point, Sydney NSW 2000",
    },
    places: [
      {
        name: "Sydney Opera House",
        category: "Architectural Icon",
        description:
          "World Heritage architectural masterpiece resting on picturesque Sydney Harbour.",
        estimatedCost: "Free exterior, tours A$45",
        visitTime: "2 hours",
        bestTime: "Sunset with harbor ferry",
        image:
          "https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=800&auto=format&fit=crop&q=80",
        address: "Bennelong Point",
        actionIcon: "landmark",
      },
      {
        name: "Bondi to Coogee Coastal Walk",
        category: "Clifftop Walkway",
        description:
          "Spectacular clifftop trail winding past ocean pools, golden beaches, and dramatic Pacific headlands.",
        estimatedCost: "Free",
        visitTime: "3 hours",
        bestTime: "Morning",
        image:
          "https://images.unsplash.com/photo-1582076197950-7a1dcdd1e07f?w=800&auto=format&fit=crop&q=80",
        address: "Bondi Beach",
        actionIcon: "camera",
      },
    ],
    foodHighlights: [
      "Avocado toast & Flat White coffee",
      "Barramundi & Sydney rock oysters",
      "Asian-fusion dining in Surry Hills",
      "Gelato by Manly wharf",
    ],
    travelTips: [
      "Use contactless tap for all ferries and trains.",
      "Swim only between the red and yellow flags at beaches.",
      "Take the Manly ferry at dusk for magical harbor lights.",
    ],
  },
  {
    slug: "maldives",
    name: "Maldives",
    country: "Indian Ocean",
    flag: "🇲🇻",
    region: "Asia",
    tagline: "Overwater bungalows, vibrant coral reefs, and turquoise lagoons",
    summary:
      "The Maldives is an archipelago of over a thousand coral islands in the Indian Ocean, celebrated for world-class diving, crystal lagoons, and tranquil private island resorts.",
    image:
      "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Maldivian Rufiyaa (MVR)",
    language: "Dhivehi & English",
    bestSeason: "November–April (Dry Northeast Monsoon)",
    idealDuration: "4–7 days",
    estimatedDailyCost: "$220–$550 per person",
    safetyNote:
      "Extremely safe resort atolls; follow reef conservation and marine life guidelines.",
    localTransit: "Speedboats, seaplanes, and public dhoni ferries",
    weather: {
      temp: "29°C",
      condition: "Tropical Sunny",
    },
    coordinates: "3.2028° N, 73.2207° E",
    featuredLandmark: {
      name: "Baa Atoll Biosphere Reserve",
      address: "Baa Atoll, Republic of Maldives",
    },
    places: [
      {
        name: "Hanifaru Bay Manta Sanctuary",
        category: "Marine Reserve",
        description:
          "World-renowned feeding hotspot for hundreds of manta rays and gentle whale sharks.",
        estimatedCost: "$120 excursion",
        visitTime: "3 hours",
        bestTime: "June–November",
        image:
          "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80",
        address: "Baa Atoll",
        actionIcon: "camera",
      },
      {
        name: "Maafushi Lagoon & Sandbank",
        category: "Lagoon Sandbank",
        description:
          "Pristine white sandbanks emerging from iridescent turquoise ocean waters.",
        estimatedCost: "$35 boat trip",
        visitTime: "Half day",
        bestTime: "Morning calm sea",
        image:
          "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&auto=format&fit=crop&q=80",
        address: "South Male Atoll",
        actionIcon: "bookmark",
      },
    ],
    foodHighlights: [
      "Fresh Yellowfin tuna sashimi",
      "Mas Huni coconut breakfast",
      "Garudhiya fragrant fish broth",
      "Fihunu Mas grilled spiced reef fish",
    ],
    travelTips: [
      "Book seaplane transfers coordinated with your international flight times.",
      "Pack reef-safe sunscreen to protect marine coral.",
    ],
  },
  {
    slug: "swiss-alps",
    name: "Swiss Alps",
    country: "Switzerland",
    flag: "🇨🇭",
    region: "Europe",
    tagline:
      "Glacier peaks, emerald alpine lakes, cogwheel trains, and chalet villages",
    summary:
      "The Swiss Alps offer legendary mountain majesty, iconic peaks like the Matterhorn and Jungfrau, panoramic glass-domed trains, and peaceful meadow trails.",
    image:
      "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1491557345352-5929e343eb89?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Swiss Franc (CHF)",
    language: "German, French, Italian, Romansh",
    bestSeason: "December–April (Snow) and June–September (Hiking)",
    idealDuration: "5–8 days",
    estimatedDailyCost: "CHF 180–CHF 350 per person",
    safetyNote:
      "High-altitude weather changes swiftly; check mountain webcams before ascending summits.",
    localTransit:
      "Swiss Federal Railways (SBB), cogwheel trains, and panoramic cable cars",
    weather: {
      temp: "14°C",
      condition: "Crisp Alpine Air",
    },
    coordinates: "46.5601° N, 8.5611° E",
    featuredLandmark: {
      name: "Matterhorn Glacier Paradise",
      address: "Zermatt, 3920 Valais, Switzerland",
    },
    places: [
      {
        name: "Matterhorn & Gornergrat Ridge",
        category: "Iconic Alpine Summit",
        description:
          "Panoramic cogwheel train climbing to 3,089 meters with mirror reflections in Riffelsee.",
        estimatedCost: "CHF 88 return",
        visitTime: "3–4 hours",
        bestTime: "Morning clear light",
        image:
          "https://images.unsplash.com/photo-1491557345352-5929e343eb89?w=800&auto=format&fit=crop&q=80",
        address: "Zermatt",
        actionIcon: "camera",
      },
      {
        name: "Jungfraujoch Top of Europe",
        category: "Glacier Observatory",
        description:
          "The highest railway station in Europe at 3,454 meters, looking out over the Great Aletsch Glacier.",
        estimatedCost: "CHF 145–210",
        visitTime: "Half day",
        bestTime: "First morning train",
        image:
          "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&auto=format&fit=crop&q=80",
        address: "Bernese Oberland",
        actionIcon: "landmark",
      },
    ],
    foodHighlights: [
      "Traditional Gruyère cheese fondue",
      "Crispy golden potato Rösti",
      "Alpine raclette over potatoes",
      "Artisanal Swiss chocolate",
    ],
    travelTips: [
      "The Swiss Travel Pass covers unlimited trains, boats, and mountain discounts.",
      "Layer thermal apparel for high glacier viewpoints.",
    ],
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    country: "India",
    flag: "🇮🇳",
    region: "Asia",
    tagline:
      "Pink sandstone palaces, lively bazaars, and the flavors of Rajasthan",
    summary:
      "Jaipur brings together Rajput architecture, craft markets, and richly spiced Rajasthani food. Plan the hilltop forts early, then explore the old city's observatories, courtyards, and bazaars at a slower pace.",
    image:
      "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1602643163983-ed0babc39797?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Indian Rupee (INR)",
    language: "Hindi, Rajasthani, English",
    bestSeason: "October–March",
    idealDuration: "2–4 days",
    estimatedDailyCost: "₹3,500–₹9,000 per person",
    safetyNote:
      "Use licensed taxis or app-based rides, agree on prices before shopping, and carry water during warmer months.",
    localTransit:
      "Metro, auto-rickshaws, app taxis, and walking in the old city",
    weather: { temp: "26°C", condition: "Sunny and dry" },
    coordinates: "26.9124° N, 75.7873° E",
    featuredLandmark: {
      name: "Amber Fort",
      address: "Devisinghpura, Amer, Jaipur",
    },
    places: [
      {
        name: "Amber Fort",
        category: "Hilltop Fort",
        description:
          "A sprawling Rajput fort complex of courtyards, painted halls, and views over Maota Lake.",
        estimatedCost: "About ₹500 for international visitors",
        visitTime: "2–3 hours",
        bestTime: "At opening",
        image:
          "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=800&auto=format&fit=crop&q=80",
        address: "Amer, Jaipur",
        actionIcon: "landmark",
      },
      {
        name: "Hawa Mahal",
        category: "Historic Landmark",
        description:
          "The ornate pink façade is best appreciated from the street and the rooftop cafes opposite.",
        estimatedCost: "About ₹200 for international visitors",
        visitTime: "1–2 hours",
        bestTime: "Morning light",
        image:
          "https://images.unsplash.com/photo-1602643163983-ed0babc39797?w=800&auto=format&fit=crop&q=80",
        address: "Hawa Mahal Road",
        actionIcon: "camera",
      },
      {
        name: "Jantar Mantar",
        category: "UNESCO Observatory",
        description:
          "Monumental stone instruments chart the movement of the sun, stars, and planets.",
        estimatedCost: "About ₹200 for international visitors",
        visitTime: "1–2 hours",
        bestTime: "Morning",
        address: "Gangori Bazaar",
        actionIcon: "landmark",
      },
    ],
    foodHighlights: [
      "Dal baati churma",
      "Pyaaz kachori",
      "Ghewar and lassi",
      "Laal maas at a trusted restaurant",
    ],
    travelTips: [
      "Visit forts early to avoid heat and tour groups.",
      "Ask before photographing people or entering religious spaces.",
      "Jaipur works well as part of the Delhi–Agra–Jaipur Golden Triangle.",
    ],
  },
  {
    slug: "kyoto",
    name: "Kyoto",
    country: "Japan",
    flag: "🇯🇵",
    region: "Asia",
    tagline: "Temple lanes, quiet gardens, and traditional tea culture",
    summary:
      "Kyoto rewards unhurried days: pair nearby temples and gardens, travel early to popular shrines, and leave time for neighborhood walks, seasonal sweets, and traditional crafts.",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Japanese Yen (JPY)",
    language: "Japanese",
    bestSeason: "March–May and October–November",
    idealDuration: "3–5 days",
    estimatedDailyCost: "¥14,000–¥28,000 per person",
    safetyNote:
      "Kyoto is generally easy to explore; follow local etiquette in residential lanes and keep clear of private properties in Gion.",
    localTransit: "JR and private railways, buses, subway, and walking",
    weather: { temp: "19°C", condition: "Seasonal and humid" },
    coordinates: "35.0116° N, 135.7681° E",
    featuredLandmark: {
      name: "Fushimi Inari Taisha",
      address: "68 Fukakusa Yabunouchicho, Fushimi Ward",
    },
    places: [
      {
        name: "Fushimi Inari Taisha",
        category: "Shinto Shrine",
        description:
          "Walk beneath thousands of vermilion torii gates along forest paths on Mount Inari.",
        estimatedCost: "Free",
        visitTime: "2–3 hours",
        bestTime: "Early morning",
        image:
          "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&auto=format&fit=crop&q=80",
        address: "Fushimi Ward",
        actionIcon: "landmark",
      },
      {
        name: "Kiyomizu-dera",
        category: "Temple & Viewpoint",
        description:
          "A historic hillside temple with a broad wooden terrace overlooking Kyoto.",
        estimatedCost: "About ¥500",
        visitTime: "1–2 hours",
        bestTime: "Opening time",
        image:
          "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80",
        address: "Higashiyama Ward",
        actionIcon: "camera",
      },
      {
        name: "Arashiyama Bamboo Grove",
        category: "Nature Walk",
        description:
          "A short, atmospheric walk through towering bamboo near the Katsura River.",
        estimatedCost: "Free",
        visitTime: "1–2 hours",
        bestTime: "Early morning",
        address: "Ukyo Ward",
        actionIcon: "camera",
      },
    ],
    foodHighlights: [
      "Yudofu tofu hot pot",
      "Seasonal kaiseki",
      "Matcha and wagashi sweets",
      "Nishiki Market street snacks",
    ],
    travelTips: [
      "Use trains for longer cross-city trips and buses for local connections.",
      "Popular temples are calmer soon after opening.",
      "Check seasonal opening hours before setting out.",
    ],
  },
  {
    slug: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    flag: "🇹🇭",
    region: "Asia",
    tagline: "River temples, night markets, and a city that loves to eat",
    summary:
      "Bangkok is a city of contrasts, from the Grand Palace and riverside temples to contemporary neighborhoods and late-night food stalls. Build your days around the river and rail lines to make the heat and traffic easier to manage.",
    image:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Thai Baht (THB)",
    language: "Thai",
    bestSeason: "November–February",
    idealDuration: "3–5 days",
    estimatedDailyCost: "฿1,800–฿5,000 per person",
    safetyNote:
      "Use metered or app-based rides, keep valuables secure in crowded areas, and dress respectfully at temples.",
    localTransit: "BTS Skytrain, MRT, river boats, and app-based taxis",
    weather: { temp: "32°C", condition: "Hot and humid" },
    coordinates: "13.7563° N, 100.5018° E",
    featuredLandmark: {
      name: "Wat Arun",
      address: "34 Arun Amarin Road, Bangkok Yai",
    },
    places: [
      {
        name: "Wat Arun",
        category: "Riverside Temple",
        description:
          "A landmark Khmer-style prang decorated with colorful porcelain overlooking the Chao Phraya.",
        estimatedCost: "About ฿200",
        visitTime: "1–2 hours",
        bestTime: "Late afternoon",
        image:
          "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800&auto=format&fit=crop&q=80",
        address: "Bangkok Yai",
        actionIcon: "landmark",
      },
      {
        name: "Grand Palace",
        category: "Royal Complex",
        description:
          "A richly detailed historic complex that includes the revered Temple of the Emerald Buddha.",
        estimatedCost: "About ฿500",
        visitTime: "2–3 hours",
        bestTime: "At opening",
        image:
          "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&auto=format&fit=crop&q=80",
        address: "Na Phra Lan Road",
        actionIcon: "landmark",
      },
      {
        name: "Chatuchak Weekend Market",
        category: "Market",
        description:
          "A sprawling weekend market for crafts, clothing, plants, and casual local food.",
        estimatedCost: "Free entry",
        visitTime: "2–4 hours",
        bestTime: "Morning",
        address: "Kamphaeng Phet 2 Road",
        actionIcon: "shop",
      },
    ],
    foodHighlights: [
      "Pad kra pao",
      "Boat noodles",
      "Mango sticky rice",
      "Yaowarat street food",
    ],
    travelTips: [
      "Plan outdoor sightseeing for morning and evening.",
      "Carry temple-appropriate clothing to cover shoulders and knees.",
      "Use the BTS, MRT, and river boats to avoid road congestion.",
    ],
  },
  {
    slug: "hanoi",
    name: "Hanoi",
    country: "Vietnam",
    flag: "🇻🇳",
    region: "Asia",
    tagline:
      "Old Quarter lanes, lakeside mornings, and northern Vietnamese flavors",
    summary:
      "Hanoi pairs a layered history with a lively everyday street culture. Explore the Old Quarter on foot, make time for museums and lakes, and use the city as a gateway to northern Vietnam's landscapes.",
    image:
      "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1600&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200&auto=format&fit=crop&q=80",
    ],
    currency: "Vietnamese Dong (VND)",
    language: "Vietnamese",
    bestSeason: "October–April",
    idealDuration: "2–4 days",
    estimatedDailyCost: "₫900,000–₫2,200,000 per person",
    safetyNote:
      "Use care when crossing busy streets, keep belongings close in crowded areas, and agree on transport fares before departing.",
    localTransit: "Walking, app-based motorbike or car rides, and city buses",
    weather: { temp: "25°C", condition: "Warm with seasonal rain" },
    coordinates: "21.0278° N, 105.8342° E",
    featuredLandmark: {
      name: "Hoan Kiem Lake",
      address: "Hoan Kiem District, Hanoi",
    },
    places: [
      {
        name: "Hoan Kiem Lake & Ngoc Son Temple",
        category: "Lake & Temple",
        description:
          "A central lake promenade and small temple that anchor the city's historic heart.",
        estimatedCost: "Lake free; temple ticket about ₫30,000",
        visitTime: "1–2 hours",
        bestTime: "Early morning",
        image:
          "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=800&auto=format&fit=crop&q=80",
        address: "Hoan Kiem District",
        actionIcon: "camera",
      },
      {
        name: "Temple of Literature",
        category: "Historic University",
        description:
          "A peaceful complex of courtyards and pavilions dedicated to Confucius and Vietnam's scholars.",
        estimatedCost: "About ₫70,000",
        visitTime: "1–2 hours",
        bestTime: "Morning",
        image:
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=800&auto=format&fit=crop&q=80",
        address: "Van Mieu, Dong Da District",
        actionIcon: "landmark",
      },
      {
        name: "Old Quarter",
        category: "Historic Neighborhood",
        description:
          "Browse guild streets, small temples, coffee shops, and the city's energetic food scene.",
        estimatedCost: "Free to explore",
        visitTime: "2–4 hours",
        bestTime: "Late afternoon",
        address: "Hoan Kiem District",
        actionIcon: "shop",
      },
    ],
    foodHighlights: ["Pho bo", "Bun cha", "Banh mi", "Egg coffee"],
    travelTips: [
      "Cross steadily and predictably; local traffic will flow around you.",
      "Carry small cash for markets and street food.",
      "Reserve a full day for a guided trip beyond the city if visiting Ha Long Bay.",
    ],
  },
];

export const exploreCities: ExploreCity[] = curatedCities.map((city) => ({
  ...city,
  activities: city.activities ?? [
    ...city.places
      .slice(0, 4)
      .map(
        (place) =>
          `Explore ${place.name}${place.bestTime ? ` during ${place.bestTime.toLowerCase()}` : ""}.`,
      ),
    `Try a local food walk featuring ${city.foodHighlights.slice(0, 2).join(" and ")}.`,
    `Use ${city.localTransit.split(",")[0]} to explore a neighborhood beyond the main sights.`,
  ],
  safetySteps: city.safetySteps ?? [
    city.safetyNote,
    ...city.travelTips,
    "Keep a copy of important documents separate from the originals and save local emergency contacts before heading out.",
  ],
}));

export function getExploreCity(slug: string) {
  return exploreCities.find((city) => city.slug === slug);
}
