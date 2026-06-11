"use client";
import type { TripInfo } from "@/lib/types/trip";
import { Calendar1, Users2, Wallet } from "lucide-react";
import {
  useMotionValueEvent,
  useScroll,
  useTransform,
  motion,
} from "motion/react";
import React, { useEffect, useRef, useState } from "react";

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export const Timeline = ({
  data,
  tripData,
}: {
  data: TimelineEntry[];
  tripData: TripInfo;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      setHeight(ref.current.getBoundingClientRect().height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className="w-full bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900 font-sans md:px-10"
      ref={containerRef}
    >
      {/* Timeline */}
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-14 md:gap-10 relative"
          >
            {/* Left side (title & dot) */}
            <div className="sticky top-40 self-start max-w-xs lg:max-w-sm md:w-[40%] flex flex-col md:flex-row items-start">
              <div className="h-10 w-10 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center shadow-md border border-neutral-300 dark:border-neutral-700 absolute left-3 md:left-0">
                <div className="h-4 w-4 rounded-full bg-primary/80 border border-primary/30" />
              </div>
              <h3 className="hidden md:block text-xl md:text-3xl font-semibold text-neutral-600 dark:text-neutral-400 md:pl-16">
                {item.title}
              </h3>
            </div>

            {/* Right side (content) */}
            <div className="relative pl-20 md:pl-4 w-full">
              <h3 className="md:hidden text-2xl mb-3 font-semibold text-neutral-600 dark:text-neutral-400">
                {item.title}
              </h3>
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-shadow duration-300">
                {item.content}
              </div>
            </div>
          </div>
        ))}

        {/* Vertical line */}
        <div
          style={{ height: height + "px" }}
          className="absolute md:left-4 left-8 top-0 overflow-hidden w-[2px] bg-neutral-200 dark:bg-neutral-700 rounded-full"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-primary via-blue-500 to-transparent rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
