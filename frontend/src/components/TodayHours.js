/**
 * This component displays the dining hall's hours for the current day in a readable format 
 * using data from open_times.json. It lists the overall open hours and the detailed 
 * time ranges for Breakfast, Lunch, Dinner, etc., formatted for clarity.
 * The purpose of this file is to visually present schedule data, not to calculate
 * current meal times - that additional logic is handled within useCurrentMeal.js.
 */

import React, { useEffect, useState } from "react";

// List of weekday names for mapping
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ---------- Time Parsing Helpers for JSON data format ----------

// Converts a string like "7:30 AM into minutes since midnight"
function parseClock(str) {
  if (!str) return null;
  const [time, suffixRaw] = str.trim().split(/\s+/);
  const [hStr, mStr = "0"] = time.split(":");

  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  const suffix = suffixRaw ? suffixRaw.toUpperCase() : "AM";

  const isPM = suffix === "PM";

  if (h === 12) h = 0; // 12 AM = 0, 12 PM = 12
  const h24 = isPM ? h + 12 : h;
  return h24 * 60 + m;
}

// Parses strings like "7-11AM" or "11:30-2 PM" into {start, end} in minutes
function parseTimeRange(rangeStr) {
  if (!rangeStr) return null;

  // normalize en dash to hyphen
  const cleaned = rangeStr.replace("–", "-").trim();
  const parts = cleaned.split("-");
  if (parts.length !== 2) return null;

  const startPart = parts[0].trim();
  const endPart = parts[1].trim();

  // Capture the AM/PM at the end of the range (if present)
  const ampmMatch = endPart.match(/\b(AM|PM)\b/i);
  const ampm = ampmMatch ? ampmMatch[1].toUpperCase() : "AM";
  const endTimeRaw = endPart.replace(/\b(AM|PM)\b/i, "").trim();

  // Convert both start and end to minutes
  let start = parseClock(`${startPart} ${ampm}`);
  const end = parseClock(`${endTimeRaw} ${ampm}`);
  if (start == null || end == null) return null;

  // Handle ranges that roll over (e.g. "11:30-2 PM" should be 11:30 AM-2 PM)
  if (start >= end) {
    const altAmpm = ampm === "AM" ? "PM" : "AM";
    const altStart = parseClock(`${startPart} ${altAmpm}`);

    if (altStart != null && altStart < end && end - altStart <= 12 * 60) {
      start = altStart;
    }
  }

  return { start, end };
}

// Converts total minutes -> formatted string like "7:00am"
function formatMinutes(minutes) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h24 >= 12 ? "pm" : "am";
  let h = h24 % 12;
  if (h === 0) h = 12;
  const minuteStr = m.toString().padStart(2, "0");
  return `${h}:${minuteStr}${ampm}`; // e.g. "7:00am"
}

// Converts a range string to a display-friendly version
function formatRangeForDisplay(timeStr) {
  const range = parseTimeRange(timeStr);
  if (!range) return timeStr; // fall back if parsing fails
  const { start, end } = range;
  return `${formatMinutes(start)} - ${formatMinutes(end)}`;
}

// Returns true if todayName matches the given days string
function dayMatches(daysStr, todayName) {
  if (!daysStr) return false;
  const str = daysStr.trim();

  // "Sunday–Saturday" / "Sunday-Saturday" -> every day
  if (str.includes("Sunday–Saturday") || str.includes("Sunday-Saturday")) {
    return true;
  }

  // Handle ranges like "Monday–Friday" / "Monday-Friday"
  if (str.includes("–") || str.includes("-")) {
    const cleaned = str.replace("–", "-");
    const [startName, endName] = cleaned.split("-").map((s) => s.trim());

    const startIdx = DAY_NAMES.indexOf(startName);
    const endIdx = DAY_NAMES.indexOf(endName);
    const todayIdx = DAY_NAMES.indexOf(todayName);

    if (startIdx === -1 || endIdx === -1 || todayIdx === -1) return false;

    // Non-wrapping range (Mon–Fri)
    if (startIdx <= endIdx) {
      return todayIdx >= startIdx && todayIdx <= endIdx;
    }
    // Wrapping range (Fri–Mon)
    return todayIdx >= startIdx || todayIdx <= endIdx;
  }

  // Single day string like "Monday"
  return str.includes(todayName);
}

// ---------- Main Component ----------

function TodayHours({ diningHallName }) {
  const [todayLabel, setTodayLabel] = useState("");
  const [overallRange, setOverallRange] = useState(null); // Full open-close for today
  const [todayMeals, setTodayMeals] = useState([]); // List of meal blocks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        // Load open_times.json
        const res = await fetch("/open_times.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const hallTimes = data.halls?.[diningHallName];
        const today = new Date();
        const todayName = DAY_NAMES[today.getDay()];

        setTodayLabel(todayName);

        if (!hallTimes) {
          // No schedule found for this hall
          setOverallRange(null);
          setTodayMeals([]);
          return;
        }

        const mealOrder = [
          "Breakfast",
          "Brunch",
          "Lunch",
          "Dinner",
          "Late Night",
        ];

        const meals = [];
        let earliestStart = null;
        let latestEnd = null;

        // Iterate through each meal type to find today's applicable slots
        mealOrder.forEach((mealType) => {
          const slots = hallTimes[mealType];
          if (!Array.isArray(slots)) return;

          slots.forEach((slot) => {
            if (!slot.time || !slot.days) return;
            if (!dayMatches(slot.days, todayName)) return;

            // Push to display list
            meals.push({
              mealType,
              time: slot.time,
            });

            // Determine earliest open / latest close
            const range = parseTimeRange(slot.time);
            if (!range) return;
            const { start, end } = range;
            if (earliestStart == null || start < earliestStart) {
              earliestStart = start;
            }
            if (latestEnd == null || end > latestEnd) {
              latestEnd = end;
            }
          });
        });

        setTodayMeals(meals);

        // Determine total open window for the day
        if (earliestStart != null && latestEnd != null) {
          setOverallRange({
            startLabel: formatMinutes(earliestStart),
            endLabel: formatMinutes(latestEnd),
          });
        } else {
          setOverallRange(null);
        }
      } catch (e) {
        console.error("Failed to load open_times.json", e);
        setError("Unable to load hours.");
        setOverallRange(null);
        setTodayMeals([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [diningHallName]);

  // --------------------- Render Section ----------------------

  if (loading) {
    return (
      <div className="today-hours-card">
        <h2 className="today-hours-title">Today's Hours</h2>
        <div className="today-hours-loading">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="today-hours-card">
        <h2 className="today-hours-title">Today's Hours</h2>
        <div className="today-hours-error">{error}</div>
      </div>
    );
  }

  const hasAny = overallRange && todayMeals.length > 0;

  return (
    <div className="today-hours-card">
      <h2 className="today-hours-title">Today's Hours</h2>
      <div className="today-hours-day">{todayLabel}</div>

      {hasAny ? (
        <>
          <div className="today-hours-range">
            {/* use normal hyphen so it matches meal rows */}
            {overallRange.startLabel} - {overallRange.endLabel}
          </div>

          <div className="today-hours-meals">
            {todayMeals.map((m, idx) => (
              <div key={`${m.mealType}-${idx}`} className="today-hours-row">
                <div className="today-hours-meal">{m.mealType}</div>
                <div className="today-hours-time">
                  {formatRangeForDisplay(m.time)}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="today-hours-closed">Closed today</div>
      )}
    </div>
  );
}

export default TodayHours;