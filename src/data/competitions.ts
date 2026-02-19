import type { Competition } from "@/lib/db";

export const COMPETITIONS: Competition[] = [
  {
    id: "comp_1bl",
    name: "1. Bundesliga",
    shortName: "1. BL",
    type: "league",
    slug: "1-bundesliga",
    sortOrder: 1,
  },
  {
    id: "comp_2bl",
    name: "2. Bundesliga",
    shortName: "2. BL",
    type: "league",
    slug: "2-bundesliga",
    sortOrder: 2,
  },
  {
    id: "comp_3bl",
    name: "3. Liga",
    shortName: "3. Liga",
    type: "league",
    slug: "3-liga",
    sortOrder: 3,
  },
  {
    id: "comp_dfb",
    name: "DFB-Pokal",
    shortName: "DFB-Pokal",
    type: "cup",
    slug: "dfb-pokal",
    sortOrder: 4,
  },
];
