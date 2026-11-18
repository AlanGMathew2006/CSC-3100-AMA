import { nutritionRingSegments } from "@csc-3100-ama/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DASHBOARD } from "../test/fixtures";
import { NutritionRing } from "./NutritionRing";

// Mock data: 51 g protein (204 kcal), 100 g carbs (400 kcal), 20 g fat (180 kcal) of 2,000 kcal.
const data = {
  ...DASHBOARD,
  today: { ...DASHBOARD.today, calories: 784, protein_g: 51, carbs_g: 100, fat_g: 20 },
  goals: { ...DASHBOARD.goals!, calories: 2000 },
};

describe("NutritionRing", () => {
  it("draws protein, carbs and fat arcs in the legend colors, sized by kcal, with a kcal legend", () => {
    const { container } = render(
      <NutritionRing
        value="1,216"
        label="Calories Remaining"
        detail="784 / 2,000 kcal"
        segments={nutritionRingSegments(data, "daily")}
      />,
    );
    const circumference = 2 * Math.PI * ((104 - 6) / 2);
    const arcs = container.querySelectorAll<SVGCircleElement>("circle.ring-segment");
    expect(Array.from(arcs).map((arc) => arc.dataset.segment)).toEqual(["protein", "carbs", "fat"]);
    [204 / 2000, 400 / 2000, 180 / 2000].forEach((fraction, index) => {
      expect(arcs[index].style.stroke).toBe(`var(--macro-${["protein", "carbs", "fat"][index]})`);
      const dash = Number(arcs[index].getAttribute("stroke-dasharray")!.split(" ")[0]);
      expect(dash).toBeCloseTo(fraction * circumference - 9, 5);
    });
    expect(screen.getByText("Protein · 204 kcal")).toBeTruthy();
    expect(screen.getByText("Carbs · 400 kcal")).toBeTruthy();
    expect(screen.getByText("Fat · 180 kcal")).toBeTruthy();
    expect(screen.queryByText(/Fiber/)).toBeNull();
    // The legend dots use the same classes (and so the same colors) as the arcs.
    expect(container.querySelectorAll(".legend-dot--protein, .legend-dot--carbs, .legend-dot--fat")).toHaveLength(3);
  });

  it("draws no arcs when nothing is eaten", () => {
    const { container } = render(
      <NutritionRing value="0" label="Calories Logged" detail="No calorie goal set" segments={nutritionRingSegments(null, "daily")} />,
    );
    expect(container.querySelectorAll("circle.ring-segment")).toHaveLength(0);
  });
});
