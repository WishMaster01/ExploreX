"use client";

import { TripPlanProvider } from "@/context/TripPlanContext";
import ChatBox from "./_components/ChatBox";
import Itinerary from "./_components/Itinerary";

const CreateNewTrip = () => {
  return (
    <TripPlanProvider>
      <div className="grid min-h-screen bg-slate-50 pt-[4.25rem] lg:grid-cols-[minmax(380px,460px)_minmax(0,1fr)] xl:grid-cols-[minmax(420px,520px)_minmax(0,1fr)]">
        <div className="min-h-[calc(100svh-4.25rem)] border-b border-slate-200/80 bg-white/75 backdrop-blur-xl lg:sticky lg:top-[4.25rem] lg:h-[calc(100svh-4.25rem)] lg:border-b-0 lg:border-r">
          <ChatBox />
        </div>

        <div className="min-w-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.08),transparent_34%),linear-gradient(180deg,#f8fafc,#eef9f8)]">
          <Itinerary />
        </div>
      </div>
    </TripPlanProvider>
  );
};

export default CreateNewTrip;
