import React from "react";
import { useCurrentMeal } from "./useCurrentMeal";
import "../styles/mealStatusBanner.css"; // <- important for styling

function CurrentMealBanner({ hallName }) {
  const { currentMeal, nextMeal, nextStartLabel, isContinuous } =
    useCurrentMeal(hallName);

  // Fallback if the hook couldn't determine anything for today
  if (!currentMeal && !nextMeal && !isContinuous) {
    return (
      <div className="meal-status-banner meal-status-banner--closed">
        <div className="meal-status-primary">
          Meal status unavailable for this hall right now.
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        "meal-status-banner " +
        (currentMeal || isContinuous
          ? "meal-status-banner--open"
          : "meal-status-banner--closed")
      }
    >
      {(currentMeal || isContinuous) && (
        <div className="meal-status-chip">
          {currentMeal ? "NOW SERVING" : "CONTINUOUS DINING"}
        </div>
      )}

      <div className="meal-status-primary">
        {currentMeal
          ? currentMeal
          : isContinuous
          ? "Limited service period — select entree options available"
          : "Closed right now"}
      </div>

      {nextMeal && nextStartLabel && (
        <div className="meal-status-secondary">
          {isContinuous
            ? `Next full meal: ${nextMeal} at ${nextStartLabel}`
            : currentMeal
            ? `Next: ${nextMeal} at ${nextStartLabel}`
            : `Opens for ${nextMeal} at ${nextStartLabel}`}
        </div>
      )}
    </div>
  );
}

export default CurrentMealBanner;