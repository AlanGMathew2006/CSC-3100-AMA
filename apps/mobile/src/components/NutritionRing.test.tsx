import { nutritionRingSegments } from "@csc-3100-ama/shared";
import { processColor } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { light } from "../theme";
import { DASHBOARD } from "../test/fixtures";
import { NutritionRing } from "./NutritionRing";

// Mock data: 51 g protein (204 kcal), 100 g carbs (400 kcal), 20 g fat (180 kcal) of 2,000 kcal.
const data = {
  ...DASHBOARD,
  today: {
    ...DASHBOARD.today,
    calories: 784,
    protein_g: 51,
    carbs_g: 100,
    fat_g: 20
  },
  goals: { ...DASHBOARD.goals!, calories: 2000 }
};

describe("NutritionRing", () => {
  it("draws protein, carbs and fat arcs in the legend colors, sized by kcal", async () => {
    await render(
      <NutritionRing
        value="1,216"
        label="Calories Remaining"
        detail="784 / 2,000 kcal"
        segments={nutritionRingSegments(data, "daily")}
      />
    );
    const radius = (104 - 6) / 2;
    const circumference = 2 * Math.PI * radius;
    const legend = light.legend;
    const expected: [string, string, number][] = [
      ["protein", legend.protein, 204 / 2000],
      ["carbs", legend.carbs, 400 / 2000],
      ["fat", legend.fat, 180 / 2000]
    ];
    for (const [key, color, fraction] of expected) {
      const arc = screen.getByTestId(`ring-segment-${key}`);
      expect(arc.props.stroke.payload).toBe(
        processColor(color)
      );
      // The dash is the share of the circle minus the gap and the round caps.
      const dash = Number([arc.props.strokeDasharray].flat()[0]);
      expect(dash).toBeCloseTo(fraction * circumference - 9, 5);
    }
    expect(
      screen.getAllByTestId(/^ring-segment-/)
    ).toHaveLength(3);
  });

  it("draws no arcs when nothing is eaten", async () => {
    await render(
      <NutritionRing
        value="0"
        label="Calories Logged"
        detail="No calorie goal set"
        segments={nutritionRingSegments(null, "daily")}
      />
    );
    expect(
      screen.queryAllByTestId(/^ring-segment-/)
    ).toHaveLength(0);
  });
});
