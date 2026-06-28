export type Destination = {
  label: string;
  city: string;
  state?: string;
  country: string;
  aliases?: string[];
  latitude: number;
  longitude: number;
  popularity: number;
};

export const DESTINATIONS: Destination[] = [
  { label: "Mumbai, Maharashtra, India", city: "Mumbai", state: "Maharashtra", country: "India", aliases: ["Bombay"], latitude: 19.076, longitude: 72.8777, popularity: 98 },
  { label: "Delhi, India", city: "Delhi", country: "India", aliases: ["New Delhi"], latitude: 28.6139, longitude: 77.209, popularity: 99 },
  { label: "Bengaluru, Karnataka, India", city: "Bengaluru", state: "Karnataka", country: "India", aliases: ["Bangalore"], latitude: 12.9716, longitude: 77.5946, popularity: 94 },
  { label: "Goa, India", city: "Goa", country: "India", aliases: ["Panaji"], latitude: 15.2993, longitude: 74.124, popularity: 97 },
  { label: "Jaipur, Rajasthan, India", city: "Jaipur", state: "Rajasthan", country: "India", aliases: ["Pink City"], latitude: 26.9124, longitude: 75.7873, popularity: 93 },
  { label: "Agra, Uttar Pradesh, India", city: "Agra", state: "Uttar Pradesh", country: "India", aliases: ["Taj Mahal"], latitude: 27.1767, longitude: 78.0081, popularity: 95 },
  { label: "Varanasi, Uttar Pradesh, India", city: "Varanasi", state: "Uttar Pradesh", country: "India", aliases: ["Banaras", "Kashi"], latitude: 25.3176, longitude: 82.9739, popularity: 90 },
  { label: "Kochi, Kerala, India", city: "Kochi", state: "Kerala", country: "India", aliases: ["Cochin"], latitude: 9.9312, longitude: 76.2673, popularity: 88 },
  { label: "Manali, Himachal Pradesh, India", city: "Manali", state: "Himachal Pradesh", country: "India", latitude: 32.2396, longitude: 77.1887, popularity: 91 },
  { label: "Srinagar, Jammu and Kashmir, India", city: "Srinagar", state: "Jammu and Kashmir", country: "India", latitude: 34.0837, longitude: 74.7973, popularity: 89 },
  { label: "Udaipur, Rajasthan, India", city: "Udaipur", state: "Rajasthan", country: "India", aliases: ["City of Lakes"], latitude: 24.5854, longitude: 73.7125, popularity: 88 },
  { label: "Chennai, Tamil Nadu, India", city: "Chennai", state: "Tamil Nadu", country: "India", aliases: ["Madras"], latitude: 13.0827, longitude: 80.2707, popularity: 86 },
  { label: "Hyderabad, Telangana, India", city: "Hyderabad", state: "Telangana", country: "India", latitude: 17.385, longitude: 78.4867, popularity: 87 },
  { label: "Kolkata, West Bengal, India", city: "Kolkata", state: "West Bengal", country: "India", aliases: ["Calcutta"], latitude: 22.5726, longitude: 88.3639, popularity: 86 },
  { label: "Pune, Maharashtra, India", city: "Pune", state: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567, popularity: 84 },
  { label: "Tokyo, Japan", city: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503, popularity: 100 },
  { label: "Kyoto, Japan", city: "Kyoto", country: "Japan", latitude: 35.0116, longitude: 135.7681, popularity: 96 },
  { label: "Paris, France", city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522, popularity: 100 },
  { label: "London, England, United Kingdom", city: "London", state: "England", country: "United Kingdom", aliases: ["UK"], latitude: 51.5072, longitude: -0.1276, popularity: 100 },
  { label: "Rome, Italy", city: "Rome", country: "Italy", latitude: 41.9028, longitude: 12.4964, popularity: 98 },
  { label: "Venice, Italy", city: "Venice", country: "Italy", latitude: 45.4408, longitude: 12.3155, popularity: 96 },
  { label: "Barcelona, Catalonia, Spain", city: "Barcelona", state: "Catalonia", country: "Spain", latitude: 41.3874, longitude: 2.1686, popularity: 98 },
  { label: "Amsterdam, Netherlands", city: "Amsterdam", country: "Netherlands", latitude: 52.3676, longitude: 4.9041, popularity: 96 },
  { label: "Dubai, United Arab Emirates", city: "Dubai", country: "United Arab Emirates", aliases: ["UAE"], latitude: 25.2048, longitude: 55.2708, popularity: 99 },
  { label: "Singapore", city: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198, popularity: 98 },
  { label: "Bangkok, Thailand", city: "Bangkok", country: "Thailand", latitude: 13.7563, longitude: 100.5018, popularity: 98 },
  { label: "Bali, Indonesia", city: "Bali", country: "Indonesia", aliases: ["Denpasar"], latitude: -8.3405, longitude: 115.092, popularity: 99 },
  { label: "Malé, Maldives", city: "Malé", country: "Maldives", aliases: ["Male", "Maldives"], latitude: 4.1755, longitude: 73.5093, popularity: 95 },
  { label: "Istanbul, Türkiye", city: "Istanbul", country: "Türkiye", aliases: ["Turkey"], latitude: 41.0082, longitude: 28.9784, popularity: 97 },
  { label: "New York City, New York, USA", city: "New York City", state: "New York", country: "USA", aliases: ["NYC", "New York"], latitude: 40.7128, longitude: -74.006, popularity: 100 },
  { label: "San Francisco, California, USA", city: "San Francisco", state: "California", country: "USA", aliases: ["SF"], latitude: 37.7749, longitude: -122.4194, popularity: 95 },
  { label: "Los Angeles, California, USA", city: "Los Angeles", state: "California", country: "USA", aliases: ["LA"], latitude: 34.0522, longitude: -118.2437, popularity: 96 },
  { label: "Toronto, Ontario, Canada", city: "Toronto", state: "Ontario", country: "Canada", latitude: 43.6532, longitude: -79.3832, popularity: 92 },
  { label: "Vancouver, British Columbia, Canada", city: "Vancouver", state: "British Columbia", country: "Canada", latitude: 49.2827, longitude: -123.1207, popularity: 92 },
  { label: "Sydney, New South Wales, Australia", city: "Sydney", state: "New South Wales", country: "Australia", latitude: -33.8688, longitude: 151.2093, popularity: 98 },
  { label: "Melbourne, Victoria, Australia", city: "Melbourne", state: "Victoria", country: "Australia", latitude: -37.8136, longitude: 144.9631, popularity: 94 },
  { label: "Cape Town, Western Cape, South Africa", city: "Cape Town", state: "Western Cape", country: "South Africa", latitude: -33.9249, longitude: 18.4241, popularity: 94 },
  { label: "Cairo, Egypt", city: "Cairo", country: "Egypt", latitude: 30.0444, longitude: 31.2357, popularity: 94 },
  { label: "Reykjavík, Iceland", city: "Reykjavík", country: "Iceland", aliases: ["Reykjavik"], latitude: 64.1466, longitude: -21.9426, popularity: 91 },
  { label: "Santorini, Greece", city: "Santorini", country: "Greece", latitude: 36.3932, longitude: 25.4615, popularity: 96 },
];

