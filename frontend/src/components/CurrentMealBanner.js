import React from "react";
import { useCurrentMeal } from "./useCurrentMeal";
import "../styles/mealStatusBanner.css"; // <- important for styling

function CurrentMealBanner({ hallName }) {
    const { currentMeal, nextMeal, nextStartLabel, isContinuous, hasSchedule } =
        useCurrentMeal(hallName);

    // Only show "unavailable" if there is NO schedule at all for this hall
    if (hasSchedule === false) {
        return (
        <div className="meal-status-banner meal-status-banner--closed">
            <div className="meal-status-primary">
            Meal status unavailable for this hall right now.
            </div>
        </div>
        );
    }

        // -------- CAFÉ MODE (no meal periods, AllDay schedules) --------
    if (hasSchedule && currentMeal === "Now Open") {
        const isPerk = hallName === "Perk Coffee Bar";
    
        return (
        <div className="meal-status-banner meal-status-banner--open">
            <div className="meal-status-chip">ALL DAY</div>
            <div className="meal-status-primary">Open</div>
    
            {nextStartLabel && (
            <div className="meal-status-secondary">
                Closes at {nextStartLabel}
                {isPerk && " *"}
            </div>
            )}
    
            {isPerk && (
            <div className="meal-status-fineprint">
                * Earth &amp; Marine Sciences and Baskin Engineering locations close at
                6 PM Mon – Thurs.
            </div>
            )}
        </div>
        );
    }
    
    if (hasSchedule && !nextMeal && currentMeal === null && nextStartLabel) {
        // Café closed, but has an AllDay schedule
        return (
        <div className="meal-status-banner meal-status-banner--closed">
            <div className="meal-status-primary">Closed</div>
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
            : "Closed"}
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