import { redirect } from "next/navigation";

/** Legacy directory redirects to the source-backed India discovery catalog. */
export default function LegacyExploreCitiesPage() {
  redirect("/explore-india");
}
