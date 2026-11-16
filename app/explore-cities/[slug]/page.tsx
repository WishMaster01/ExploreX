import { redirect } from "next/navigation";

/** Legacy city slugs are no longer exposed without validated destination data. */
export default function LegacyCityPage() {
  redirect("/explore-india");
}
