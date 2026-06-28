export type CityPlace = {
  name: string;
  category: string;
  description: string;
  estimatedCost: string;
  visitTime: string;
  bestTime: string;
};

export type ExploreCity = {
  slug: string;
  name: string;
  country: string;
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
  places: CityPlace[];
  foodHighlights: string[];
  travelTips: string[];
};

export const exploreCities: ExploreCity[] = [
  {
    slug: "paris",
    name: "Paris",
    country: "France",
    tagline: "Art, bakeries, river walks, and cinematic landmarks",
    summary: "Paris combines major museums with walkable neighborhoods, gardens, markets, and late-evening river views. Grouping sights by arrondissement keeps travel time realistic.",
    image: "https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=1600&auto=format&fit=crop&q=80",
    gallery: ["https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1200&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&auto=format&fit=crop&q=80"],
    currency: "Euro (EUR)", language: "French", bestSeason: "April–June and September–October", idealDuration: "4–6 days", estimatedDailyCost: "€140–€260 per person", safetyNote: "Generally safe in visitor districts; watch for pickpockets around stations and crowded landmarks.", localTransit: "Metro, RER, buses, and extensive walking routes",
    places: [
      { name: "Louvre Museum", category: "Museum", description: "A world-scale collection best approached with a preselected gallery route.", estimatedCost: "€22", visitTime: "3–4 hours", bestTime: "Opening time" },
      { name: "Eiffel Tower & Champ de Mars", category: "Landmark", description: "Tower viewpoints and riverside lawns with excellent sunset access.", estimatedCost: "Free–€36", visitTime: "2–3 hours", bestTime: "Late afternoon" },
      { name: "Montmartre", category: "Neighborhood", description: "Hillside streets, Sacré-Cœur, studios, cafes, and city viewpoints.", estimatedCost: "Free", visitTime: "2–4 hours", bestTime: "Morning" },
      { name: "Musée d'Orsay", category: "Museum", description: "Impressionist collections inside a converted railway station.", estimatedCost: "About €16", visitTime: "2–3 hours", bestTime: "Weekday afternoon" },
    ],
    foodHighlights: ["Croissants and viennoiserie", "Classic bistro menus", "Cheese and market picnics", "Seasonal patisserie"],
    travelTips: ["Reserve major museums before arrival.", "Plan each day around adjacent arrondissements.", "Keep a contactless card plus a small amount of cash."],
  },
  {
    slug: "tokyo", name: "Tokyo", country: "Japan", tagline: "Neon districts, temples, food alleys, and calm gardens",
    summary: "Tokyo rewards district-based planning. One rail corridor can connect historic temples, design neighborhoods, food markets, and evening viewpoints without excessive backtracking.",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1600&auto=format&fit=crop&q=80",
    gallery: ["https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=1200&auto=format&fit=crop&q=80"],
    currency: "Japanese yen (JPY)", language: "Japanese", bestSeason: "March–May and October–November", idealDuration: "5–8 days", estimatedDailyCost: "¥15,000–¥30,000 per person", safetyNote: "Low violent-crime risk; follow late-night transit times and local etiquette.", localTransit: "JR trains, metro lines, buses, and walking",
    places: [
      { name: "Sensō-ji", category: "Temple", description: "Historic Asakusa temple complex with traditional shopping streets.", estimatedCost: "Free", visitTime: "1–2 hours", bestTime: "Early morning" },
      { name: "Meiji Shrine", category: "Culture", description: "Forested shrine grounds beside Harajuku and Omotesando.", estimatedCost: "Free", visitTime: "1–2 hours", bestTime: "Morning" },
      { name: "Shibuya", category: "Neighborhood", description: "Crossing, shopping, dining, music, and elevated skyline views.", estimatedCost: "Free–¥2,500", visitTime: "2–4 hours", bestTime: "Late afternoon onward" },
      { name: "teamLab Planets", category: "Experience", description: "Timed immersive digital-art installations in Toyosu.", estimatedCost: "About ¥4,200", visitTime: "2 hours", bestTime: "Reserved time slot" },
    ],
    foodHighlights: ["Sushi counters", "Ramen shops", "Izakaya small plates", "Depachika food halls"],
    travelTips: ["Use a rechargeable transit card.", "Group stops along the same rail corridor.", "Book limited-capacity experiences early."],
  },
  {
    slug: "new-york", name: "New York City", country: "United States", tagline: "Skyline energy, food neighborhoods, parks, and shows",
    summary: "New York works best when Manhattan and outer-borough neighborhoods are treated as separate clusters. Subway-aware sequencing prevents long cross-city transfers.",
    image: "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=1600&auto=format&fit=crop&q=80",
    gallery: ["https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1200&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&auto=format&fit=crop&q=80"],
    currency: "US dollar (USD)", language: "English", bestSeason: "April–June and September–November", idealDuration: "4–7 days", estimatedDailyCost: "$190–$350 per person", safetyNote: "Use normal big-city precautions, stay aware late at night, and use official transport services.", localTransit: "Subway, buses, ferries, commuter rail, and walking",
    places: [
      { name: "Central Park", category: "Nature", description: "Large urban park with lakes, trails, museums, and seasonal events.", estimatedCost: "Free", visitTime: "2–4 hours", bestTime: "Morning" },
      { name: "Metropolitan Museum of Art", category: "Museum", description: "Major global collection on Museum Mile.", estimatedCost: "About $30", visitTime: "3–4 hours", bestTime: "Opening time" },
      { name: "Brooklyn Bridge & DUMBO", category: "Walk", description: "Skyline walk connecting lower Manhattan with Brooklyn waterfront parks.", estimatedCost: "Free", visitTime: "2–3 hours", bestTime: "Sunrise or sunset" },
      { name: "Broadway", category: "Entertainment", description: "Large selection of musicals and plays around the Theater District.", estimatedCost: "$60–$220", visitTime: "3 hours", bestTime: "Evening" },
    ],
    foodHighlights: ["Pizza slices", "Bagels", "Chinatown dumplings", "Neighborhood food halls"],
    travelTips: ["Cluster plans above or below Midtown.", "Allow extra time for weekend subway changes.", "Compare attraction passes against actual planned visits."],
  },
  {
    slug: "rome", name: "Rome", country: "Italy", tagline: "Ancient ruins, piazzas, trattorias, and layered history",
    summary: "Rome's historic core is dense but uneven underfoot. Smart morning reservations and neighborhood clustering make the city considerably easier to explore.",
    image: "https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=1600&auto=format&fit=crop&q=80",
    gallery: ["https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=1200&auto=format&fit=crop&q=80"],
    currency: "Euro (EUR)", language: "Italian", bestSeason: "April–May and September–October", idealDuration: "3–5 days", estimatedDailyCost: "€120–€230 per person", safetyNote: "Generally safe in central areas; stay alert on crowded transit and near major attractions.", localTransit: "Metro, buses, trams, taxis, and walking",
    places: [
      { name: "Colosseum & Roman Forum", category: "History", description: "Ancient arena and archaeological district requiring timed entry.", estimatedCost: "About €18", visitTime: "3–4 hours", bestTime: "First entry" },
      { name: "Vatican Museums", category: "Museum", description: "Extensive papal collections culminating in the Sistine Chapel.", estimatedCost: "About €20 plus fees", visitTime: "3–4 hours", bestTime: "Reserved morning slot" },
      { name: "Pantheon", category: "Landmark", description: "Exceptionally preserved Roman temple in the historic center.", estimatedCost: "About €5", visitTime: "45–75 minutes", bestTime: "Early morning" },
      { name: "Trastevere", category: "Neighborhood", description: "Lanes, churches, aperitivo, and traditional Roman dining.", estimatedCost: "Free", visitTime: "2–4 hours", bestTime: "Late afternoon" },
    ],
    foodHighlights: ["Carbonara", "Cacio e pepe", "Supplì", "Seasonal gelato"],
    travelTips: ["Carry water and wear supportive shoes.", "Reserve the Colosseum and Vatican in advance.", "Avoid scheduling both major sites on one rushed day."],
  },
  {
    slug: "dubai", name: "Dubai", country: "United Arab Emirates", tagline: "Architecture, beaches, desert evenings, and modern culture",
    summary: "Dubai spans long distances, so itineraries should group Downtown, Old Dubai, Marina, and desert activities rather than repeatedly crossing the city.",
    image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1600&auto=format&fit=crop&q=80",
    gallery: ["https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1200&auto=format&fit=crop&q=80"],
    currency: "UAE dirham (AED)", language: "Arabic and English", bestSeason: "November–March", idealDuration: "3–5 days", estimatedDailyCost: "AED 500–1,100 per person", safetyNote: "Low street-crime risk; observe local laws, dress expectations, and heat precautions.", localTransit: "Metro, tram, buses, taxis, and ride-hailing",
    places: [
      { name: "Burj Khalifa", category: "Viewpoint", description: "Timed observation decks overlooking Downtown Dubai.", estimatedCost: "AED 169–459", visitTime: "1.5–2 hours", bestTime: "Before sunset" },
      { name: "Al Fahidi Historical District", category: "Culture", description: "Restored lanes, museums, galleries, and creek-side heritage.", estimatedCost: "Mostly free", visitTime: "2–3 hours", bestTime: "Morning" },
      { name: "Desert conservation experience", category: "Adventure", description: "Dune landscapes, wildlife, dinner, and evening cultural programs.", estimatedCost: "AED 250–700", visitTime: "5–7 hours", bestTime: "Afternoon to evening" },
      { name: "Dubai Marina", category: "Neighborhood", description: "Waterfront walk, dining, beaches, and skyline views.", estimatedCost: "Free", visitTime: "2–4 hours", bestTime: "Evening" },
    ],
    foodHighlights: ["Emirati cuisine", "Levantine grills", "South Asian dining", "Creek-side cafes"],
    travelTips: ["Avoid outdoor-heavy midday plans in hot months.", "Use the Metro for Downtown and Marina corridors.", "Check cultural and legal guidance before arrival."],
  },
  {
    slug: "sydney", name: "Sydney", country: "Australia", tagline: "Harbor views, beaches, coastal walks, and relaxed dining",
    summary: "Sydney combines ferries, rail, beaches, and coastal trails. Weather and daylight are important when sequencing harbor viewpoints and outdoor activities.",
    image: "https://images.unsplash.com/photo-1530276371031-2511efff9d5a?w=1600&auto=format&fit=crop&q=80",
    gallery: ["https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=1200&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1582076197950-7a1dcdd1e07f?w=1200&auto=format&fit=crop&q=80"],
    currency: "Australian dollar (AUD)", language: "English", bestSeason: "September–November and March–May", idealDuration: "4–6 days", estimatedDailyCost: "A$180–A$320 per person", safetyNote: "Generally safe; use beach flags, sun protection, and current coastal-weather guidance.", localTransit: "Trains, buses, light rail, ferries, and walking",
    places: [
      { name: "Sydney Opera House", category: "Landmark", description: "Harbor architecture, guided tours, and performing arts.", estimatedCost: "Free exterior; tours from about A$45", visitTime: "1–2 hours", bestTime: "Morning or sunset" },
      { name: "Bondi to Coogee Walk", category: "Coastal walk", description: "Clifftop route connecting beaches and ocean pools.", estimatedCost: "Free", visitTime: "2–4 hours", bestTime: "Morning" },
      { name: "Manly Ferry", category: "Scenic transit", description: "Harbor crossing linking Circular Quay with beaches and trails.", estimatedCost: "Standard transit fare", visitTime: "Half day", bestTime: "Clear afternoon" },
      { name: "Royal Botanic Garden", category: "Nature", description: "Harbor-side gardens beside the Opera House and city center.", estimatedCost: "Free", visitTime: "1–2 hours", bestTime: "Morning" },
    ],
    foodHighlights: ["Modern Australian brunch", "Fresh seafood", "Asian-Australian dining", "Harbor-side cafes"],
    travelTips: ["Use contactless payment on public transport.", "Check surf and weather guidance before coastal plans.", "Combine ferries with harbor neighborhoods."],
  },
];

export function getExploreCity(slug: string) {
  return exploreCities.find((city) => city.slug === slug);
}

