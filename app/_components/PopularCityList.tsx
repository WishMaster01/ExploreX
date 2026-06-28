"use client";

import React from "react";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";
import { SectionHeading, travelGradient } from "@/components/travel/TravelUI";
import { Camera, Gem, MapPin, Utensils } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type City = {
  category: string;
  title: string;
  src: string;
  summary: string;
  highlights: string[];
  gallery: { src: string; alt: string }[];
};

export function PopularCityList() {
  const cards = cities.map((city, index) => (
    <Card
      key={city.src}
      index={index}
      card={{
        category: city.category,
        title: city.title,
        src: city.src,
        content: <CityContent city={city} />,
      }}
    />
  ));

  return (
    <section
      id="explore"
      className={`w-full overflow-hidden border-t border-slate-200/80 py-16 md:py-24 ${travelGradient}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Destination intelligence"
          title="Explore iconic cities with AI-ready inspiration."
          description="Each showcase is structured for future highlights, hidden gems, food picks, photo spots, family plans, solo routes, and couple-friendly experiences."
        />
        <div className="mt-6 text-center"><Link href="/explore-cities" className="inline-flex rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-teal-700">Browse all city guides</Link></div>
        <Carousel items={cards} />
      </div>
    </section>
  );
}

const CityContent = ({ city }: { city: City }) => {
  return (
    <div className="glass-card rounded-2xl p-5 sm:p-8">
      <p className="mx-auto max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        <span className="mb-2 block font-heading text-lg font-bold text-slate-900">
          {city.category}
        </span>
        {city.summary}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {city.highlights.map((highlight, index) => {
          const icons = [
            <MapPin key="map" className="size-4" />,
            <Gem key="gem" className="size-4" />,
            <Utensils key="food" className="size-4" />,
            <Camera key="camera" className="size-4" />,
          ];

          return (
            <div
              key={highlight}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                {icons[index % icons.length]}
              </div>
              {highlight}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {city.gallery.map((image) => (
          <Image
            key={image.src}
            src={image.src}
            alt={image.alt}
            width={500}
            height={500}
            sizes="(min-width: 640px) 50vw, 100vw"
            className="aspect-square w-full rounded-xl object-cover shadow-sm transition duration-500 hover:scale-[1.02] hover:shadow-md"
          />
        ))}
      </div>
    </div>
  );
};

const cities: City[] = [
  {
    category: "Paris, France",
    title: "Art, bakeries, river walks, and cinematic landmarks",
    src: "https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=1600&auto=format&fit=crop&q=80",
    summary:
      "Paris blends world-class museums, neighborhood cafes, gardens, romantic walks, and architecture that rewards both first-time visitors and slow travelers.",
    highlights: ["Louvre and Orsay route", "Canal Saint-Martin hidden gems", "Classic bistros and patisseries", "Eiffel and Montmartre photo spots"],
    gallery: [
      { src: "https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1000&auto=format&fit=crop&q=80", alt: "Eiffel Tower" },
      { src: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1000&auto=format&fit=crop&q=80", alt: "Paris streets" },
    ],
  },
  {
    category: "New York, USA",
    title: "Skyline energy, food neighborhoods, parks, and shows",
    src: "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=1600&auto=format&fit=crop&q=80",
    summary:
      "New York is built for personalized itineraries, from galleries and Broadway to skyline viewpoints, local food crawls, parks, ferries, and late-night neighborhoods.",
    highlights: ["Midtown to downtown route", "Brooklyn neighborhood finds", "Pizza, bagels, and markets", "Skyline and bridge photography"],
    gallery: [
      { src: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1000&auto=format&fit=crop&q=80", alt: "Times Square" },
      { src: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1000&auto=format&fit=crop&q=80", alt: "New York skyline" },
    ],
  },
  {
    category: "Tokyo, Japan",
    title: "Neon districts, temples, design, food, and calm gardens",
    src: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1600&auto=format&fit=crop&q=80",
    summary:
      "Tokyo pairs intense urban discovery with calm cultural pockets, making it ideal for AI-planned days grouped by train lines, food styles, and crowd timing.",
    highlights: ["Shibuya and Harajuku loop", "Yanaka and Kagurazaka gems", "Ramen, sushi, and izakaya picks", "Night street photography"],
    gallery: [
      { src: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1000&auto=format&fit=crop&q=80", alt: "Shibuya Crossing" },
      { src: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=1000&auto=format&fit=crop&q=80", alt: "Tokyo cherry blossoms" },
    ],
  },
  {
    category: "Rome, Italy",
    title: "Ancient ruins, piazzas, trattorias, and layered history",
    src: "https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=1600&auto=format&fit=crop&q=80",
    summary:
      "Rome rewards smart route sequencing because landmarks, neighborhoods, and restaurants sit in dense clusters with very different crowd patterns.",
    highlights: ["Forum and Colosseum cluster", "Trastevere local lanes", "Carbonara and gelato picks", "Sunset piazza viewpoints"],
    gallery: [
      { src: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1000&auto=format&fit=crop&q=80", alt: "Colosseum" },
      { src: "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=1000&auto=format&fit=crop&q=80", alt: "Vatican City" },
    ],
  },
  {
    category: "Dubai, UAE",
    title: "Architecture, beaches, desert evenings, and luxury stays",
    src: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1600&auto=format&fit=crop&q=80",
    summary:
      "Dubai works best with budget-aware planning across luxury hotels, beach districts, malls, cultural quarters, desert activities, and skyline dining.",
    highlights: ["Downtown and Marina routing", "Al Fahidi heritage stops", "Levantine and Emirati food", "Desert golden-hour photos"],
    gallery: [
      { src: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1000&auto=format&fit=crop&q=80", alt: "Burj Khalifa" },
      { src: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1000&auto=format&fit=crop&q=80", alt: "Dubai desert" },
    ],
  },
  {
    category: "Sydney, Australia",
    title: "Harbor views, beaches, coastal walks, and relaxed dining",
    src: "https://images.unsplash.com/photo-1530276371031-2511efff9d5a?w=1600&auto=format&fit=crop&q=80",
    summary:
      "Sydney combines ferries, neighborhoods, beaches, and nature, making timeline planning valuable for weather, daylight, and transit choices.",
    highlights: ["Harbor ferry itinerary", "Manly and Watsons Bay gems", "Seafood and brunch picks", "Opera House viewpoints"],
    gallery: [
      { src: "https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=1000&auto=format&fit=crop&q=80", alt: "Sydney Opera House" },
      { src: "https://images.unsplash.com/photo-1582076197950-7a1dcdd1e07f?w=1000&auto=format&fit=crop&q=80", alt: "Bondi Beach" },
    ],
  },
];
