"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Bot, Compass, Menu, Sparkles, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState("");
  const pathname = usePathname();
  const { user } = useUser();

  const menuOptions = [
    { name: "Explore", path: "/#explore" },
    { name: "AI Features", path: "/#ai-features" },
    { name: "Saved Trips", path: "/#saved-trips" },
    { name: "Planner", path: "/create-new-trip" },
  ];

  const isActive = (path: string) => {
    if (path === "/create-new-trip") return pathname?.startsWith(path);
    return pathname === "/" && path.startsWith("/#") && activeHash === path.slice(1);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash);

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    // Avoid setState cascading: close menu when pathname changes.
    // Using microtask defers the update until after the current render.
    queueMicrotask(() => setMenuOpen(false));
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-slate-200/80 bg-white/85 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-2xl"
          : "border-b border-transparent bg-white/60 backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-[4.25rem] w-full max-w-[1760px] items-center justify-between px-4 sm:px-6 lg:px-10 2xl:px-12">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <div className="relative h-10 w-40 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-lg shadow-slate-900/10 transition group-hover:shadow-slate-900/20 sm:w-44">
            <Image
              src="/ExploreX_LOGO_header.png"
              alt="ExploreX"
              fill
              priority
              sizes="176px"
              className="object-cover"
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-sm lg:flex">
          {menuOptions.map((menu) => (
            <Link
              key={menu.name}
              href={menu.path}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900",
                isActive(menu.path) && "text-white",
              )}
            >
              {isActive(menu.path) && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{menu.name}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div className="hidden items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/80 px-3 py-1.5 text-xs font-semibold text-teal-700 xl:flex">
            <Sparkles className="size-3.5" />
            AI optimizer live
          </div>
          {!user ? (
            <SignInButton mode="modal">
              <Button className="btn-shine rounded-full bg-gradient-to-r from-teal-600 to-teal-500 px-5 text-white shadow-lg shadow-teal-500/20 hover:from-teal-700 hover:to-teal-600">
                Get Started
              </Button>
            </SignInButton>
          ) : (
            <>
              <Link href="/create-new-trip">
                <Button className="btn-shine rounded-full bg-gradient-to-r from-teal-600 to-teal-500 px-5 text-white shadow-lg shadow-teal-500/20 hover:from-teal-700 hover:to-teal-600">
                  <Bot className="size-4" />
                  Create Trip
                </Button>
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9 rounded-xl ring-2 ring-slate-200",
                  },
                }}
              />
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-600 lg:hidden"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <nav className="grid gap-1.5 px-4 py-4">
              {menuOptions.map((menu, i) => (
                <motion.div
                  key={menu.name}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={menu.path}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition",
                      isActive(menu.path)
                        ? "bg-teal-50 text-teal-700"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {menu.name}
                    <Compass className="size-4 text-slate-400" />
                  </Link>
                </motion.div>
              ))}
              <div className="pt-2">
                {!user ? (
                  <SignInButton mode="modal">
                    <Button className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white">
                      Get Started
                    </Button>
                  </SignInButton>
                ) : (
                  <Link
                    href="/create-new-trip"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Button className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white">
                      Create New Trip
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
