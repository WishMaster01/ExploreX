"use client";

import type { DisplayTrip } from "@/lib/types/trip";
import { Button } from "@/components/ui/button";
import { Camera, Download, FileText, X } from "lucide-react";

function tripFileName(trip: DisplayTrip, extension: string) {
  const slug = trip.destination
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `trip-${slug || "plan"}.${extension}`;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;

    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function estimateImageHeight(trip: DisplayTrip) {
  const dayLines = trip.days.reduce(
    (sum, day) => sum + 96 + day.segments.length * 42,
    0,
  );
  const hotelLines = Math.min(trip.hotels.length, 5) * 42;

  return Math.max(1100, 540 + dayLines + hotelLines);
}

function downloadTripAsImage(trip: DisplayTrip) {
  const width = 1400;
  const height = estimateImageHeight(trip);
  const scale = 2;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, 340);
  gradient.addColorStop(0, "#0f766e");
  gradient.addColorStop(0.58, "#14b8a6");
  gradient.addColorStop(1, "#0284c7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, 340);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 58px Arial";
  let y = drawWrappedText(ctx, `Trip to ${trip.destination}`, 72, 112, 980, 68);

  ctx.font = "500 28px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  y = drawWrappedText(
    ctx,
    `${trip.origin} to ${trip.destination} | ${trip.duration} | ${trip.group_size} | ${trip.budget}`,
    72,
    y + 18,
    1100,
    38,
  );

  const stats = [
    ["Stops", String(trip.totalActivities)],
    ["Transit", trip.transitMinutes],
    ["Walking", trip.walkDistance],
  ];

  stats.forEach(([label, value], index) => {
    const x = 72 + index * 238;
    drawRoundedRect(ctx, x, 238, 204, 74, 18);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "600 18px Arial";
    ctx.fillText(label, x + 20, 266);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 25px Arial";
    ctx.fillText(value, x + 20, 298);
  });

  y = 420;
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px Arial";
  ctx.fillText("Day-wise itinerary", 72, y);
  y += 44;

  for (const day of trip.days) {
    drawRoundedRect(ctx, 72, y, 1256, 58 + day.segments.length * 42, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#dbeafe";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#0f766e";
    ctx.font = "700 22px Arial";
    ctx.fillText(`Day ${day.day}`, 104, y + 38);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 25px Arial";
    ctx.fillText(day.title, 218, y + 38);

    let itemY = y + 82;
    ctx.font = "500 22px Arial";
    ctx.fillStyle = "#334155";
    for (const segment of day.segments) {
      ctx.fillText(`${segment.period}: ${segment.title}`, 104, itemY);
      ctx.fillStyle = "#64748b";
      ctx.font = "400 18px Arial";
      ctx.fillText(`${segment.duration} | ${segment.cost}`, 920, itemY);
      ctx.fillStyle = "#334155";
      ctx.font = "500 22px Arial";
      itemY += 42;
    }

    y += 84 + day.segments.length * 42;
  }

  if (trip.hotels.length > 0) {
    y += 20;
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 34px Arial";
    ctx.fillText("Hotel options", 72, y);
    y += 46;

    ctx.font = "500 22px Arial";
    for (const hotel of trip.hotels.slice(0, 5)) {
      ctx.fillStyle = "#334155";
      ctx.fillText(
        `${hotel.name} | ${hotel.price}/night | Rating ${hotel.rating}`,
        96,
        y,
      );
      y += 42;
    }
  }

  y += 20;
  ctx.fillStyle = "#64748b";
  ctx.font = "500 20px Arial";
  drawWrappedText(
    ctx,
    `Top attractions: ${trip.topAttractions.join(", ")}`,
    72,
    y,
    1220,
    30,
  );

  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = tripFileName(trip, "png");
    anchor.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printableTripHtml(trip: DisplayTrip) {
  const days = trip.days
    .map(
      (day) => `
        <section>
          <h2>Day ${day.day}: ${escapeHtml(day.title)}</h2>
          <p class="muted">${escapeHtml(day.best)} | ${escapeHtml(day.route)}</p>
          ${day.segments
            .map(
              (segment) => `
                <div class="item">
                  <strong>${escapeHtml(segment.period)}: ${escapeHtml(segment.title)}</strong>
                  <p>${escapeHtml(segment.detail)}</p>
                  <p class="muted">${escapeHtml(segment.address)} | ${escapeHtml(segment.duration)} | ${escapeHtml(segment.cost)}</p>
                </div>
              `,
            )
            .join("")}
        </section>
      `,
    )
    .join("");

  const hotels = trip.hotels
    .slice(0, 6)
    .map(
      (hotel) => `
        <div class="item">
          <strong>${escapeHtml(hotel.name)}</strong>
          <p>${escapeHtml(hotel.description)}</p>
          <p class="muted">${escapeHtml(hotel.address)} | ${escapeHtml(hotel.price)}/night | Rating ${hotel.rating}</p>
        </div>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(trip.destination)} trip plan</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; }
          main { max-width: 900px; margin: 0 auto; padding: 36px; }
          header { border-radius: 24px; background: linear-gradient(135deg, #0f766e, #14b8a6, #0284c7); color: white; padding: 36px; }
          h1 { margin: 0; font-size: 38px; line-height: 1.1; }
          h2 { margin: 0 0 8px; font-size: 22px; }
          p { line-height: 1.55; }
          section { margin-top: 22px; border: 1px solid #e2e8f0; border-radius: 18px; background: white; padding: 22px; break-inside: avoid; }
          .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 24px; }
          .meta div { border: 1px solid rgba(255,255,255,0.28); border-radius: 14px; padding: 12px; background: rgba(255,255,255,0.14); }
          .label { display: block; color: rgba(255,255,255,0.72); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
          .value { display: block; margin-top: 4px; font-weight: 700; }
          .item { border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 14px; }
          .item:first-of-type { border-top: 0; padding-top: 0; }
          .muted { color: #64748b; }
          .actions { position: sticky; top: 0; z-index: 2; padding: 14px 0; text-align: right; }
          button { border: 0; border-radius: 12px; background: #0f766e; color: white; cursor: pointer; font-weight: 700; padding: 11px 16px; }
          @media print {
            body { background: white; }
            main { max-width: none; padding: 0; }
            .actions { display: none; }
            section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <main>
          <div class="actions"><button onclick="window.print()">Save as PDF</button></div>
          <header>
            <h1>Trip to ${escapeHtml(trip.destination)}</h1>
            <p>${escapeHtml(trip.origin)} to ${escapeHtml(trip.destination)}</p>
            <div class="meta">
              <div><span class="label">Duration</span><span class="value">${escapeHtml(trip.duration)}</span></div>
              <div><span class="label">Budget</span><span class="value">${escapeHtml(trip.budget)}</span></div>
              <div><span class="label">Group</span><span class="value">${escapeHtml(trip.group_size)}</span></div>
              <div><span class="label">Stops</span><span class="value">${trip.totalActivities}</span></div>
            </div>
          </header>
          ${days}
          <section>
            <h2>Hotel options</h2>
            ${hotels || "<p>No hotel recommendations in this plan.</p>"}
          </section>
          <section>
            <h2>Top attractions</h2>
            <p>${escapeHtml(trip.topAttractions.join(", "))}</p>
          </section>
        </main>
        <script>setTimeout(() => window.print(), 500);</script>
      </body>
    </html>
  `;
}

function openTripPdfWindow(trip: DisplayTrip) {
  const printWindow = window.open("", "_blank", "width=980,height=1100");

  if (!printWindow) {
    window.alert("Allow popups to open the PDF export window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(printableTripHtml(trip));
  printWindow.document.close();
}

export function ExportPlanDialog({
  trip,
  onClose,
  onExportJson,
}: {
  trip: DisplayTrip;
  onClose: () => void;
  onExportJson: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
              Export plan
            </p>
            <h2 className="mt-1 font-heading text-xl font-bold text-slate-900">
              Download your itinerary
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a shareable image or a printable PDF format.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close export dialog"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-3 p-5">
          <Button
            type="button"
            onClick={() => downloadTripAsImage(trip)}
            className="h-auto justify-start rounded-xl bg-teal-600 p-4 text-left text-white hover:bg-teal-700"
          >
            <Camera className="size-5" />
            <span>
              <span className="block font-bold">Download image</span>
              <span className="block text-xs font-medium text-teal-50">
                Saves a PNG summary card of the itinerary.
              </span>
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => openTripPdfWindow(trip)}
            className="h-auto justify-start rounded-xl p-4 text-left"
          >
            <FileText className="size-5 text-teal-600" />
            <span>
              <span className="block font-bold text-slate-900">
                Open PDF window
              </span>
              <span className="block text-xs font-medium text-slate-500">
                Opens a print-ready plan. Use Save as PDF in the print dialog.
              </span>
            </span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onExportJson}
            className="justify-start rounded-xl text-slate-600"
          >
            <Download className="size-4" />
            Download JSON data
          </Button>
        </div>
      </div>
    </div>
  );
}
