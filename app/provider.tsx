"use client";
import React, { useContext, useEffect, useRef, useState } from "react";
import Header from "./_components/Header";
import { useUser } from "@clerk/nextjs";
import { UserDetailContext } from "@/context/UserDetailContext";
import {
  AITravelCopilot,
  PageTransition,
  TravelFooter,
} from "@/components/travel/TravelUI";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig } from "motion/react";
import type { User } from "@/lib/domain/types";
import { logger } from "@/lib/observability/logger";
import { userDtoSchema } from "@/lib/domain/schemas";
import { ExploreXLoader } from "@/components/travel/ExploreXLoader";

const Provider = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { user, isLoaded } = useUser();
  const [userDetail, setUserDetail] = useState<User | null>(null);
  const [profileReadyUserId, setProfileReadyUserId] = useState<string | null>(
    null,
  );
  const [navigationPending, setNavigationPending] = useState(false);
  const navigationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const isImmersiveRoute =
    pathname?.startsWith("/create-new-trip") || pathname?.startsWith("/sign-");

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setUserDetail(null);
        setProfileReadyUserId(null);
      });
      return;
    }

    let isCurrent = true;

    fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: user.fullName || user.firstName || "New User",
        email: user.emailAddresses[0]?.emailAddress || "",
        imageUrl: user.imageUrl || "",
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          logger.warn("profile.sync_failed", { status: response.status });
          return;
        }

        const payload: unknown = await response.json();
        const parsedUser = userDtoSchema.safeParse(payload);
        if (!parsedUser.success) {
          logger.warn("profile.sync_invalid_response");
          return;
        }
        const result = parsedUser.data;
        if (isCurrent) {
          setUserDetail(result);
        }
      })
      .catch(() => {
        logger.warn("profile.sync_request_failed");
      })
      .finally(() => {
        if (isCurrent) {
          setProfileReadyUserId(user.id);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [user]);

  useEffect(() => {
    const handleNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname) return;

      setNavigationPending(true);
      if (navigationTimeout.current) clearTimeout(navigationTimeout.current);
      navigationTimeout.current = setTimeout(() => {
        setNavigationPending(false);
      }, 8000);
    };

    document.addEventListener("click", handleNavigation, true);
    return () => {
      document.removeEventListener("click", handleNavigation, true);
      if (navigationTimeout.current) clearTimeout(navigationTimeout.current);
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setNavigationPending(false);
      if (navigationTimeout.current) clearTimeout(navigationTimeout.current);
    }, 250);
    return () => clearTimeout(timeout);
  }, [pathname, navigationPending]);

  const isAuthLoading =
    !isLoaded || Boolean(user && profileReadyUserId !== user.id);

  return (
    <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
      <MotionConfig reducedMotion="user">
        {isAuthLoading ? (
          <ExploreXLoader />
        ) : (
          <div className="min-h-screen overflow-x-hidden travel-page-bg">
            {navigationPending && (
              <div
                className="travel-navigation-progress"
                role="status"
                aria-label="Loading page"
                aria-live="polite"
              >
                <span />
              </div>
            )}
            <Header />
            <main>
              <AnimatePresence mode="wait">
                <PageTransition key={pathname}>{children}</PageTransition>
              </AnimatePresence>
            </main>
            {!isImmersiveRoute && <TravelFooter />}
            {!pathname?.startsWith("/sign-") && <AITravelCopilot />}
          </div>
        )}
      </MotionConfig>
    </UserDetailContext.Provider>
  );
};

export default Provider;

export const useUserDetail = () => {
  const context = useContext(UserDetailContext);
  if (!context) throw new Error("useUserDetail must be used within Provider");
  return context;
};
