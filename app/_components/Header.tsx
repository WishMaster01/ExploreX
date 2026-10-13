"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { ArrowRight, ChevronDown, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { ExploreXBrand } from "@/components/travel/ExploreXBrand";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const isPlannerRoute = pathname.startsWith("/create-new-trip");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setMenuOpen(false));
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        `/explore-cities?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      setSearchOpen(false);
    }
  };

  const closeMenu = () => setMenuOpen(false);
  const navLinkClass = (href: string) =>
    cn(
      "text-xs font-semibold uppercase tracking-wider transition hover:text-teal-300",
      pathname === href || pathname.startsWith(`${href}/`)
        ? "text-teal-300"
        : "text-slate-200",
    );

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          isPlannerRoute
            ? "border-b border-white/10 bg-[#060a12]/95 shadow-[0_10px_35px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
            : scrolled
              ? "border-b border-white/10 bg-[#060a12]/85 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)]"
              : "border-b border-white/5 bg-transparent backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex h-[4.75rem] w-full max-w-[1760px] items-center justify-between px-4 sm:px-6 lg:px-10 2xl:px-12">
          <Link
            href="/"
            aria-label="ExploreX home"
            className="group flex items-center gap-3"
          >
            <ExploreXBrand />
          </Link>

          {/* Center Navigation Links (Matching Image: Destinations ⌵, Experiences ⌵, Trips, About Us, Blog) */}
          <nav className="hidden items-center gap-8 lg:flex">
            <div className="relative group">
              <Link
                href="/explore-cities"
                className={cn(
                  navLinkClass("/explore-cities"),
                  "flex items-center gap-1.5 py-4",
                )}
              >
                <span>Destinations</span>
                <ChevronDown className="size-3 text-slate-400 transition group-hover:rotate-180" />
              </Link>
              <div className="invisible absolute left-0 top-full z-50 w-56 translate-y-2 rounded-2xl border border-white/10 bg-slate-950/95 p-2 opacity-0 shadow-2xl backdrop-blur-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                {[
                  ["All city guides", "/explore-cities"],
                  ["Jaipur, India", "/explore-cities/jaipur"],
                  ["Kyoto, Japan", "/explore-cities/kyoto"],
                  ["Bangkok, Thailand", "/explore-cities/bangkok"],
                  ["Hanoi, Vietnam", "/explore-cities/hanoi"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-teal-300"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative group">
              <Link
                href="/#ai-features"
                className="flex items-center gap-1.5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:text-white"
              >
                <span>Experiences</span>
                <ChevronDown className="size-3 text-slate-400 transition group-hover:rotate-180" />
              </Link>
              <div className="invisible absolute left-0 top-full z-50 w-56 translate-y-2 rounded-2xl border border-white/10 bg-slate-950/95 p-2 opacity-0 shadow-2xl backdrop-blur-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <Link
                  href="/#ai-features"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-teal-300"
                >
                  AI trip intelligence
                </Link>
                <Link
                  href="/create-new-trip"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-teal-300"
                >
                  Build an itinerary
                </Link>
                <Link
                  href="/travel-signals/high-altitude-prep"
                  className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-teal-300"
                >
                  Travel preparation
                </Link>
              </div>
            </div>

            <Link href="/saved-trips" className={navLinkClass("/saved-trips")}>
              Trips
            </Link>

            <Link
              href="/saved-cities"
              className={navLinkClass("/saved-cities")}
            >
              Saved Cities
            </Link>

            <Link href="/ai-features" className={navLinkClass("/ai-features")}>
              AI Studio
            </Link>

            <Link
              href="/travel-signals/high-altitude-prep"
              className={navLinkClass("/travel-signals")}
            >
              Travel Signals
            </Link>
          </nav>

          {/* Right Action Items: Search, EN ⌵, Mint Green "Plan Your Trip ➔" button */}
          <div className="hidden items-center gap-4 md:flex">
            {/* Search Icon Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search destinations"
              className="flex size-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Search className="size-4" />
            </button>

            {/* Distinctive Mint/Teal Green Button from Image */}
            <Link
              href="/create-new-trip"
              className="inline-flex items-center gap-2 rounded-full bg-[#2dd4bf] hover:bg-[#34d399] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-[0_0_20px_rgba(45,212,191,0.35)] transition duration-200 hover:scale-[1.03]"
            >
              <span>Plan Your Trip</span>
              <ArrowRight className="size-3.5 stroke-[2.5]" />
            </Link>

            {user ? (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "h-9 w-9 rounded-full ring-2 ring-white/20 hover:ring-teal-400 transition",
                  },
                }}
              />
            ) : (
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            className="rounded-full border border-white/15 bg-white/5 p-2 text-slate-200 shadow-sm backdrop-blur transition hover:border-teal-400 hover:text-white lg:hidden"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-white/10 bg-[#060a12]/95 backdrop-blur-2xl lg:hidden"
            >
              <nav className="grid gap-2 px-5 py-5 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setSearchOpen(true);
                  }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold text-slate-200 hover:bg-white/5"
                >
                  <Search className="size-4 text-teal-300" />
                  Search destinations
                </button>
                <Link
                  href="/explore-cities"
                  onClick={closeMenu}
                  className="rounded-xl px-4 py-3 font-semibold text-slate-200 hover:bg-white/5"
                >
                  Destinations
                </Link>
                <Link
                  href="/saved-trips"
                  onClick={closeMenu}
                  className="rounded-xl px-4 py-3 font-semibold text-slate-200 hover:bg-white/5"
                >
                  Trips
                </Link>
                <Link
                  href="/saved-cities"
                  onClick={closeMenu}
                  className="rounded-xl px-4 py-3 font-semibold text-slate-200 hover:bg-white/5"
                >
                  Saved Cities
                </Link>
                <Link
                  href="/ai-features"
                  onClick={closeMenu}
                  className="rounded-xl px-4 py-3 font-semibold text-slate-200 hover:bg-white/5"
                >
                  AI Studio
                </Link>
                <Link
                  href="/travel-signals/high-altitude-prep"
                  onClick={closeMenu}
                  className="rounded-xl px-4 py-3 font-semibold text-slate-200 hover:bg-white/5"
                >
                  Travel Signals
                </Link>

                <div className="pt-3">
                  <Link
                    href="/create-new-trip"
                    onClick={closeMenu}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2dd4bf] py-3 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg"
                  >
                    <span>Plan Your Trip</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Quick Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-md"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSearchOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                  Search ExploreX Destinations
                </span>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
              <form onSubmit={handleSearch} className="mt-4 flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Where would you like to explore? (e.g. Bali, Rome, Paris)..."
                  aria-label="Search cities and countries"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-teal-400"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-teal-400 px-5 text-sm font-bold text-slate-950 hover:bg-teal-300"
                >
                  Search
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
