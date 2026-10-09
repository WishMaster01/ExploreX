"use client";
import React, { useContext, useEffect, useState } from "react";
import Header from "./_components/Header";
import { useUser } from "@clerk/nextjs";
import { UserDetailContext } from "@/context/UserDetailContext";
import {
  AITravelCopilot,
  PageTransition,
  TravelFooter,
} from "@/components/travel/TravelUI";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "motion/react";
import type { User } from "@/lib/domain/types";
import { logger } from "@/lib/observability/logger";
import { userDtoSchema } from "@/lib/domain/schemas";

const Provider = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { user } = useUser();
  const [userDetail, setUserDetail] = useState<User | null>(null);
  const pathname = usePathname();
  const isImmersiveRoute =
    pathname?.startsWith("/create-new-trip") || pathname?.startsWith("/sign-");

  useEffect(() => {
    if (!user) {
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
      });

    return () => {
      isCurrent = false;
    };
  }, [user]);

  return (
    <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
      <div className="min-h-screen overflow-x-hidden travel-page-bg">
        <Header />
        <main>
          <AnimatePresence mode="wait">
            <PageTransition key={pathname}>{children}</PageTransition>
          </AnimatePresence>
        </main>
        {!isImmersiveRoute && <TravelFooter />}
        {!pathname?.startsWith("/sign-") && <AITravelCopilot />}
      </div>
    </UserDetailContext.Provider>
  );
};

export default Provider;

export const useUserDetail = () => {
  const context = useContext(UserDetailContext);
  if (!context) throw new Error("useUserDetail must be used within Provider");
  return context;
};
