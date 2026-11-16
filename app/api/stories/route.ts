import { NextResponse } from "next/server";
import "server-only";

/**
 * No user trip stories are currently published. Destination profiles are not
 * traveler stories, and private trip records require explicit consent.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    source: "no_published_stories",
    stories: [],
  });
}
