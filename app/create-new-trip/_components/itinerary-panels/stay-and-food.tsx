"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { DisplayTrip } from "@/lib/types/trip";
import { fuzzySearch } from "@/lib/algorithms/search/fuzzy-search";
import { Hotel, Search, Star, Utensils } from "lucide-react";
import { fadeUp, PanelTitle } from "./panel-primitives";
import { GlassPanel } from "@/components/travel/TravelUI";

export function StayAndFoodPanel({ trip }: { trip: DisplayTrip }) {
  const [hotelQuery, setHotelQuery] = useState("");

  const matchingHotels = hotelQuery.trim()
    ? fuzzySearch(
        hotelQuery,
        trip.hotels.map((hotel) => ({
          ...hotel,
          label: hotel.name,
          aliases: [hotel.address],
        })),
        10,
      )
    : trip.hotels;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        custom={0}
      >
        <GlassPanel className="h-full p-5 sm:p-6">
          <PanelTitle
            icon={<Hotel className="size-5" />}
            title="Hotel Recommendations"
          />

          <div className="mt-5 space-y-4">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              AI suggestions and prices may be inaccurate. Confirm each place,
              availability, hours, and price with the provider before booking.
              Images are illustrative.
            </p>
            {trip.hotels.length > 0 && (
              <label className="relative mb-3 block">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={hotelQuery}
                  onChange={(event) => setHotelQuery(event.target.value)}
                  placeholder="Search hotels or locations"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-400"
                />
              </label>
            )}

            {matchingHotels.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hotels in this plan yet.
              </p>
            ) : (
              matchingHotels.map((hotel) => (
                <div
                  key={hotel.name}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={hotel.image}
                      alt={hotel.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="40vw"
                      unoptimized
                    />
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-heading font-bold text-slate-900">
                          {hotel.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {hotel.address}
                        </p>
                      </div>

                      <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        <Star className="size-3.5 fill-current" />
                        {hotel.rating}
                      </span>
                    </div>

                    {hotel.sourceMetadata?.source === "VERIFIED" &&
                    hotel.sourceMetadata.mapsUrl ? (
                      <a
                        href={hotel.sourceMetadata.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-blue-700 underline"
                      >
                        Name matched · Google Maps
                      </a>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        AI generated · verify before booking
                      </p>
                    )}

                    {hotel.amenities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {hotel.amenities.slice(0, 6).map((amenity) => (
                          <span
                            key={amenity}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {hotel.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-teal-700">
                        {hotel.price}/night
                      </p>

                      {hotel.recommendationScore !== undefined && (
                        <span className="text-[11px] font-bold text-slate-500">
                          Match {Math.round(hotel.recommendationScore * 100)}%
                        </span>
                      )}
                    </div>
                    {hotel.recommendationReasons.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                        {hotel.recommendationReasons
                          .slice(0, 3)
                          .map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        custom={1}
      >
        <GlassPanel className="h-full p-5 sm:p-6">
          <PanelTitle
            icon={<Utensils className="size-5" />}
            title="Dining & Food Spots"
          />

          <div className="mt-5 space-y-3">
            {trip.restaurants.map((restaurant) => (
              <div
                key={restaurant.name}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading font-bold text-slate-900">
                      {restaurant.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {restaurant.type}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                      {restaurant.price}
                    </span>
                    {restaurant.rating !== undefined ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                        <Star className="size-3 fill-current" />
                        {restaurant.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        Rating unavailable
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {restaurant.note}
                </p>
                {restaurant.address && (
                  <p className="mt-2 text-xs text-slate-500">
                    {restaurant.address}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(restaurant.dietary_tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-800"
                    >
                      {tag}
                    </span>
                  ))}
                  {(restaurant.meal_types ?? []).map((meal) => (
                    <span
                      key={meal}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700"
                    >
                      {meal}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {restaurant.geo_coordinates
                    ? `Coordinates available · ${restaurant.geo_coordinates.latitude.toFixed(3)}, ${restaurant.geo_coordinates.longitude.toFixed(3)}`
                    : "Distance unavailable · no restaurant coordinates"}
                </p>
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  {restaurant.source_metadata?.source === "VERIFIED"
                    ? "Name matched · Google Maps"
                    : "AI generated · verify before visiting"}
                </p>
              </div>
            ))}
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
