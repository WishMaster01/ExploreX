import Hero from "./_components/Hero";
import { PopularCityList } from "./_components/PopularCityList";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <PopularCityList />
    </div>
  );
}
