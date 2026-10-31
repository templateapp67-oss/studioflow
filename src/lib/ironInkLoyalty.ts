import type { RewardThreshold } from "../types";

/**
 * Template 12 perk suggestions.
 *
 * These are deliberately inactive configuration examples, not live promises.
 * The owner adds one, adjusts its point threshold and description, and only
 * then enables it; the storefront reads the existing saved `loyaltyConfig`.
 */
export const IRON_INK_PERK_SUGGESTIONS: RewardThreshold[] = [
  {
    id: "ii-perk-suggestion-1",
    title: "10% off after 3 visits",
    requiredPoints: 150,
    rewardType: "percentage_discount",
    discountValue: 10,
    applicableCategory: "Tattoo & piercing services",
    description:
      "Editable example. StudioFlow counts points, so set the threshold to whatever a three-visit client would earn in your programme. Nothing is published until you enable and save it.",
    isActive: false,
    couponCodePrefix: "INK10",
  },
  {
    id: "ii-perk-suggestion-2",
    title: "Free aftercare kit at a milestone",
    requiredPoints: 500,
    rewardType: "free_service",
    discountValue: 100,
    applicableCategory: "Aftercare",
    description:
      "Editable example. Describe exactly what the kit contains and set the point milestone that suits your studio. Nothing is published until you enable and save it.",
    isActive: false,
    couponCodePrefix: "AFTERCARE",
  },
  {
    id: "ii-perk-suggestion-3",
    title: "Priority booking window",
    requiredPoints: 350,
    rewardType: "free_service",
    discountValue: 100,
    applicableCategory: "Booking",
    description:
      "Editable example. Use this only if your team can genuinely hold an early booking window. Nothing is published until you enable and save it.",
    isActive: false,
    couponCodePrefix: "PRIORITY",
  },
];

export function blankIronInkPerk(id: string): RewardThreshold {
  return {
    id,
    title: "",
    requiredPoints: 250,
    rewardType: "percentage_discount",
    discountValue: 10,
    applicableCategory: "",
    description: "",
    isActive: false,
    couponCodePrefix: "INK",
  };
}
