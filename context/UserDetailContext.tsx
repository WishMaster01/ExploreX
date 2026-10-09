import { createContext } from "react";
import type { UserDetailContextValue } from "@/lib/domain/types";

export const UserDetailContext = createContext<UserDetailContextValue | null>(
  null,
);
