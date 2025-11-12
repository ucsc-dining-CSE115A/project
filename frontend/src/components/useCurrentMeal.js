/**
 * This component determine's the dining hall's current status based on real-time data.
 * It analyzes the JSON to figure out which meal is currently being served, what the
 * next meal will be, and whether the hall is in "continuous dining" (open between meals),
 * to notify the user of reduced availability. The logic involves parsing and comparing
 * time ranges in minutes since midnight to make time-based calculations consistent.
 * While this file handles meal state and time logic, CurrentMealBanner is used to display
 * live meal period information.
 */

import { useEffect, useState } from "react";

// Days of the week - used to match which day's schedule applies today
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ------------------ Helper Functions -------------------

// Converts "7:00 AM" -> minutes since midnight
// This makes it easy to do math and comparisons on times later rather than raw time.
function parseClock(str) {
  if (!str) return null;
  const [time, suffixRaw] = str.trim().split(/\s+/);
  const [hStr, mStr = "0"] = time.split(":");

  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  const suffix = suffixRaw ? suffixRaw.toUpperCase() : "AM";

  const isPM = suffix === "PM";
  if (h === 12) h = 0;
  const h24 = isPM ? h + 12 : h;

  return h24 * 60 + m; // minutes since midnight
}

// Parse a time range like "11:30-2 PM" into { start, end }
// Handles both normal ranges and cases that cross noon
function parseTimeRange(rangeStr) {
  if (!rangeStr) return null;

  const cleaned = rangeStr.replace("–", "-").trim();
  const parts = cleaned.split("-");
  if (parts.length !== 2) return null;

  const startPart = parts[0].trim();
  const endPart = parts[1].trim();

  const ampmMatch = endPart.match(/\b(AM|PM)\b/i);
  const ampm = ampmMatch ? ampmMatch[1].toUpperCase() : "AM";

  const endTimeRaw = endPart.replace(/\b(AM|PM)\b/i, "").trim();

  let start = parseClock(`${startPart} ${ampm}`);
  const end = parseClock(`${endTimeRaw} ${ampm}`);
  if (start == null || end == null) return null;

  // Handle wraparound (e.g., 11:30–2 PM), edge cases
  if (start >= end) {
    const altAmpm = ampm === "AM" ? "PM" : "AM";
    const altStart = parseClock(`${startPart} ${altAmpm}`);
    if (altStart != null && altStart < end && end - altStart <= 12 * 60) {
      start = altStart;
    }
  }
  return { start, end };
}

// Checks if a slot's day range mathces today's day.
// "Monday-Friday" is true if today is Wednesday.
function dayMatches(daysStr, todayName) {
  if (!daysStr) return false;
  const str = daysStr.trim();

  // Shortcut for open everyday
  if (str.includes("Sunday–Saturday") || str.includes("Sunday-Saturday"))
    return true;

  // Handle ranges like "Monday-Friday" or "Friday-Monday"
  if (str.includes("–") || str.includes("-")) {
    const cleaned = str.replace("–", "-");
    const [startName, endName] = cleaned.split("-").map((s) => s.trim());

    const startIdx = DAY_NAMES.indexOf(startName);
    const endIdx = DAY_NAMES.indexOf(endName);
    const todayIdx = DAY_NAMES.indexOf(todayName);

    if (startIdx === -1 || endIdx === -1 || todayIdx === -1) return false;

    // Non-wrapping range (Mon-Fri)
    if (startIdx <= endIdx)
      return todayIdx >= startIdx && todayIdx <= endIdx;
    // Wrapping range (Fri-Mon)
    return todayIdx >= startIdx || todayIdx <= endIdx;
  }

  // Single day match
  return str.includes(todayName);
}

// Checks if we are currently inside a slot's range (for a given meal period)
// Returns whether it's active and what its start/end are in minutes.
function checkSlot(slot, todayName, nowMinutes) {
  if (!slot || !slot.time || !slot.days) return { inRange: false, start: null };

  // Only consider slots active on today's day name
  if (!dayMatches(slot.days, todayName)) {
    return { inRange: false, start: null };
  }

  const range = parseTimeRange(slot.time);
  if (!range) return { inRange: false, start: null };

  const { start, end } = range;
  const inRange = nowMinutes >= start && nowMinutes < end;

  return { inRange, start, end };
}

// Main Hook Component:
// Determines the current dining status for a given hall.
// Returns info like:
//      - currentMeal: what's being served right now.
//      - nextMeal: what's next and when.
//      - isContinuous: true if open but between meals.
export function useCurrentMeal(hallName) {
  // Store state for UI to consome
  const [currentMeal, setCurrentMeal] = useState(null);
  const [nextMeal, setNextMeal] = useState(null);
  const [nextStartLabel, setNextStartLabel] = useState(null);
  const [sortedMeals, setSortedMeals] = useState([]);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [isContinuous, setIsContinuous] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Fetch the schedule JSON
        const res = await fetch("/open_times.json");
        if (!res.ok) {
          console.error("Failed to fetch open_times.json", res.status);
          setHasSchedule(false);
          return;
        }
        const data = await res.json();

        // Get the times for the selected dining halls
        const hallTimes = data.halls?.[hallName];
        if (!hallTimes) {
          setHasSchedule(false);
          setCurrentMeal(null);
          setNextMeal(null);
          setNextStartLabel(null);
          setSortedMeals([]);
          setIsContinuous(false);
          return;
        }

        setHasSchedule(true);

        // Figure out what time it is right now and convert to minutes since midnight
        const now = new Date();
        const todayName = DAY_NAMES[now.getDay()];
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        // Meals we care about in flow order
        const allMealTypes = [
          "Breakfast",
          "Brunch",
          "Lunch",
          "Dinner",
          "Late Night",
        ];

        // Only include meal types that exist for this hall
        const mealTypesPresent = allMealTypes.filter(
          (t) => Array.isArray(hallTimes[t]) && hallTimes[t].length > 0
        );

        let current = null;
        let next = null;
        let nextStart = null;

        // Collect all ranges for continuous dining detection
        const todayRanges = [];

        // Loop through every meal to determine what's currently or next active
        mealTypesPresent.forEach((mealType) => {
          const slots = hallTimes[mealType];

          slots.forEach((slot) => {
            const { inRange, start, end } = checkSlot(
              slot,
              todayName,
              nowMinutes
            );

            // Store all time ranges for continous dining calculation
            if (start != null && end != null) todayRanges.push({ start, end });

            // If we're currently within a range, mark that meal as current
            if (inRange) {
              current = mealType;

            // Otherwise, track the earliest upcoming start time for next meal
            } else if (start != null && nowMinutes < start) {
              if (nextStart == null || start < nextStart) {
                next = mealType;
                nextStart = start;
              }
            }
          });
        });

        // Update state for current and next meal
        setCurrentMeal(current);
        setNextMeal(next);

        // Compute "Continuous Dining" detection
        let overallStart = null;
        let overallEnd = null;
        todayRanges.forEach(({ start, end }) => {
          if (overallStart == null || start < overallStart)
            overallStart = start;
          if (overallEnd == null || end > overallEnd) overallEnd = end;
        });

        // Determine if hall is open but between meals
        const isWithinOverall =
          overallStart != null &&
          overallEnd != null &&
          nowMinutes >= overallStart &&
          nowMinutes < overallEnd;

        setIsContinuous(isWithinOverall && !current);

        // Format next meal's start time for display on banner
        if (nextStart != null) {
          const h24 = Math.floor(nextStart / 60);
          const m = nextStart % 60;
          const ampm = h24 >= 12 ? "PM" : "AM";
          let h = h24 % 12;
          if (h === 0) h = 12;
          const label =
            m === 0
              ? `${h} ${ampm}`
              : `${h}:${m.toString().padStart(2, "0")}${ampm}`;
          setNextStartLabel(label);
        } else {
          setNextStartLabel(null);
        }

        // Sort for display
        const ordered = [...mealTypesPresent].sort((a, b) => {
          if (a === current && b !== current) return -1;
          if (b === current && a !== current) return 1;
          if (a === next && b !== next) return -1;
          if (b === next && a !== next) return 1;
          return 0;
        });
        setSortedMeals(ordered);
      } catch (e) {
        // Fallback if the JSON parsing fails
        console.error("Error loading open_times.json", e);
        setHasSchedule(false);
        setCurrentMeal(null);
        setNextMeal(null);
        setNextStartLabel(null);
        setSortedMeals([]);
        setIsContinuous(false);
      }
    }

    load();
  }, [hallName]);

  // Returns values to be used by components like CurrentMealBanner
  return {
    currentMeal,
    nextMeal,
    nextStartLabel,
    sortedMeals,
    hasSchedule,
    isContinuous,
  };
}