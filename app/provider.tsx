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

const Provider = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { user } = useUser();
  const [userDetail, setUserDetail] = useState<any>();
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
          console.error("Failed to create user");
          return;
        }

        const result = await response.json();
        if (isCurrent) {
          setUserDetail(result);
          console.log("User created:", result);
        }
      })
      .catch((error) => {
        console.error("Error creating user:", error);
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
  return useContext(UserDetailContext);
};
