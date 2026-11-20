import { expect, test } from "@playwright/test";
import { testPlan } from "../lib/agent-planner/test-fixtures";

const hasAuthState = Boolean(
  process.env.E2E_AUTH_STATE ||
  (process.env.E2E_EMAIL && process.env.E2E_PASSWORD),
);

test.describe("authenticated primary trip journey", () => {
  test.skip(
    !hasAuthState,
    "Set E2E_AUTH_STATE to a storage state for a disposable authenticated test account.",
  );

  test("plans, inspects evidence and costs, edits, and saves an itinerary", async ({
    page,
  }) => {
    let modelCalls = 0;
    let savedPlan:
      | { itinerary?: { activities?: { place_name: string }[] }[] }
      | undefined;
    await page.route("**/api/aimodel", async (route) => {
      modelCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          modelCalls === 1
            ? { resp: "Your itinerary is ready to build.", ui: "final" }
            : {
                schemaVersion: "1.0",
                status: "ready",
                resp: "Validated sample itinerary.",
                trip_plan: testPlan,
                evidence: [
                  {
                    title: "Test source",
                    sourceUrl: "https://example.test/source",
                    attribution: "Deterministic E2E fixture",
                  },
                ],
              },
        ),
      });
    });
    await page.route("**/api/discoveries?**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ discoveries: [] }),
      }),
    );
    await page.route("**/api/discoveries/saved", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ savedDiscoveries: [] }),
      }),
    );
    await page.route("**/api/users", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "e2e-user-1",
          name: "ExploreX E2E User",
          email: "explorex-e2e@example.test",
          imageUrl: null,
          subscription: "free",
          role: "USER",
        }),
      }),
    );
    await page.route("**/api/trips", async (route) => {
      if (route.request().method() === "POST") {
        savedPlan = route.request().postDataJSON()?.plan;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "e2e-trip-1", deduplicated: false }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/create-new-trip");
    await page.getByLabel("Starting from").fill("Delhi");
    await page.getByLabel("Destination", { exact: true }).fill("Jaipur");
    await page.getByLabel("Start date").fill("2027-01-12");
    await page.getByLabel("End date").fill("2027-01-12");
    await page.getByLabel("Travelers").fill("2");
    await page.getByLabel("Total budget").fill("10000");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(
      page.getByRole("heading", { name: /Jaipur adventure/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Evidence sources:/)).toBeVisible();
    await expect(page.getByText("Test Heritage Site")).toBeVisible();
    await expect(page.getByText(/Cost estimate:/)).toBeVisible();

    const activity = page.getByRole("heading", { name: "Test Heritage Site" });
    const activityRow = page.locator("li").filter({ has: activity });
    await activityRow.getByRole("button", { name: "Edit" }).click();
    await activityRow.locator("input").fill("Updated Heritage Site");
    await activityRow.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("heading", { name: "Updated Heritage Site" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Save Trip" }).click();
    await expect(page.getByText("Trip saved successfully.")).toBeVisible();
    expect(savedPlan?.itinerary?.[0]?.activities?.[0]?.place_name).toBe(
      "Updated Heritage Site",
    );
    expect(modelCalls).toBe(2);
  });

  test("shares and revokes a trip, submits feedback, and saves/removes/reports a discovery", async ({
    page,
  }) => {
    let feedbackSubmitted = false;
    let reportSubmitted = false;
    let shareCreated = false;
    let shareRevoked = false;
    const discoveryActions: string[] = [];
    let discoverySaved = false;
    await page.route("**/api/users", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "e2e-user-1",
          name: "ExploreX E2E User",
          email: "explorex-e2e@example.test",
          imageUrl: null,
          subscription: "free",
          role: "USER",
        }),
      }),
    );
    await page.route("**/api/trips?**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          trips: [
            {
              id: "e2e-trip-1",
              title: "Jaipur Test Trip",
              destination: "Jaipur",
              origin: "Delhi",
              duration: "1 day",
              budget: "10000 INR",
              hotels: [],
              itinerary: testPlan.itinerary,
              createdAt: new Date().toISOString(),
            },
          ],
          nextCursor: null,
        }),
      }),
    );
    await page.route("**/api/discoveries?**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          discoveries: [
            {
              id: "discovery-e2e-1",
              title: "Test community place",
              description: "A deterministic community fixture.",
              destinationId: "jaipur-in",
              category: "heritage",
              locationLabel: null,
              sensitiveLocation: false,
              accessRestrictions: null,
              commercialRelationship: null,
              estimatedCostMinor: null,
              currencyCode: null,
              durationMinutes: null,
              trustSignals: {
                sourceCorroborated: false,
                moderatorReviewed: true,
                communityCorroborated: false,
                visitReported: false,
              },
            },
          ],
        }),
      }),
    );
    await page.route("**/api/discoveries/saved", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          savedDiscoveries: discoverySaved ? [{ id: "discovery-e2e-1" }] : [],
        }),
      }),
    );
    await page.route("**/api/discoveries/feedback/overall", async (route) => {
      feedbackSubmitted = route.request().method() === "POST";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ saved: true }),
      });
    });
    await page.route("**/api/trips/share", async (route) => {
      if (route.request().method() === "POST") {
        shareCreated = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            sharePath: "/shared-trips/e2e-capability-token",
          }),
        });
        return;
      }
      if (route.request().method() === "DELETE") {
        shareRevoked = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ revoked: true }),
        });
        return;
      }
      await route.continue();
    });
    await page.route(
      "**/api/discoveries/discovery-e2e-1/signals",
      async (route) => {
        const body = route.request().postDataJSON() as { action?: string };
        if (route.request().method() === "POST" && body.action) {
          discoveryActions.push(body.action);
          if (body.action === "save") discoverySaved = true;
          if (body.action === "unsave") discoverySaved = false;
          if (body.action === "report") reportSubmitted = true;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ recorded: true }),
        });
      },
    );
    page.on("dialog", (dialog) =>
      dialog.accept("The opening hours are inaccurate."),
    );

    await page.goto("/saved-trips");
    await page
      .getByRole("button", { name: "Create secure share link" })
      .click();
    await expect(page.getByLabel(/Anyone with this link/)).toHaveValue(
      /shared-trips\/e2e-capability-token/,
    );
    expect(shareCreated).toBe(true);
    await page.getByRole("button", { name: "Revoke share link" }).click();
    await expect(
      page.getByRole("button", { name: "Create secure share link" }),
    ).toBeVisible();
    expect(shareRevoked).toBe(true);
    await page
      .getByRole("button", { name: /Share optional post-trip feedback/i })
      .click();
    await page.getByLabel("Overall satisfaction").selectOption("5");
    await page.getByLabel(/I confirm that I completed this trip/).check();
    await page.getByRole("button", { name: "Submit private feedback" }).click();
    await expect(page.getByRole("status")).toContainText("feedback was saved");
    expect(feedbackSubmitted).toBe(true);

    await page.goto("/uncovered");
    await expect(page.getByText("Test community place")).toBeVisible();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(
      page.getByRole("button", { name: "Remove saved" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Remove saved" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Remove saved" }).click();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    await page.getByRole("button", { name: "Report" }).click();
    await expect(page.getByRole("status")).toContainText("recorded");
    expect(reportSubmitted).toBe(true);
    expect(discoveryActions).toEqual(["save", "unsave", "report"]);
  });
});
