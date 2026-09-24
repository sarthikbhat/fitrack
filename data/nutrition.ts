export type MacroTarget = { kcal: number; protein: number; carbs: number; fat: number };
export const TARGETS: MacroTarget = {
  kcal: 2750,
  protein: 125,
  carbs: 390,
  fat: 78,
};
export const RULES: string[] = [
  "Nothing here needs a separate dish. You eat what is cooked, in bigger portions.",
  "One katori means one normal serving bowl. When you are unsure, take two.",
  "A teaspoon of ghee over the rice at lunch and dinner. That is 90 kcal a day for no effort.",
  "Whey goes in a shaker with milk, not water. Water costs you 180 kcal you cannot afford.",
  "Full-fat milk only. Toned milk costs you ~250 kcal across the day.",
  "Ask to be served rather than serving yourself. You under-serve yourself.",
  "Two boiled eggs replace any missed snack. 140 kcal, no cooking, no excuse.",
];

export type PlanMeal = { id: string; time: string; slot: string; hl?: boolean; items: string; kcal: number; p: number };
export type NutDay = { day: string; full: string; train: string; veg: boolean; meals: PlanMeal[] };
export const MEALS: NutDay[] = [
  {
    day: "Mon",
    full: "Monday",
    train: "Day 1 · Push A",
    veg: false,
    meals: [
      { id: "mon1", time: "08:00", slot: "Pre-workout", hl: true, items: "1 banana, 250 ml full-fat milk, 3 dates.", kcal: 320, p: 11 },
      { id: "mon2", time: "10:40", slot: "Breakfast · post-workout", hl: true, items: "1 scoop whey in 250 ml milk the moment you walk in. Then 2 chapatis with ghee and 1 katori of whatever sabzi is made.", kcal: 720, p: 43 },
      { id: "mon3", time: "13:45", slot: "Lunch", items: "2 cups rice, 1 katori dal, 1 tsp ghee over the rice, 150 g curd.", kcal: 685, p: 20 },
      { id: "mon4", time: "16:45", slot: "Snack", items: "2 slices brown bread with 2 tbsp peanut butter.", kcal: 410, p: 14 },
      { id: "mon5", time: "20:45", slot: "Dinner", items: "1.5 cups rice and your 150 g share of the chicken. Salad if there is any.", kcal: 600, p: 39 },
    ],
  },
  {
    day: "Tue",
    full: "Tuesday",
    train: "Day 2 · Pull A",
    veg: true,
    meals: [
      { id: "tue1", time: "08:00", slot: "Pre-workout", hl: true, items: "1 banana, 250 ml full-fat milk, 3 dates.", kcal: 320, p: 11 },
      { id: "tue2", time: "10:40", slot: "Breakfast · post-workout", hl: true, items: "1 scoop whey in 250 ml milk, then 2 chapatis with ghee and 1 katori sabzi.", kcal: 720, p: 43 },
      { id: "tue3", time: "13:45", slot: "Lunch", items: "1.5 cups rice, 1 katori rajma or chana - whatever is made - 1 tsp ghee, 150 g curd.", kcal: 640, p: 22 },
      { id: "tue4", time: "16:45", slot: "Snack", items: "Sattu drink - 40 g sattu in 250 ml milk - and 20 g almonds.", kcal: 430, p: 20 },
      { id: "tue5", time: "20:45", slot: "Dinner", items: "1.5 cups rice, 2 katori dal, 150 g curd. Take the dal twice tonight.", kcal: 660, p: 28 },
    ],
  },
  {
    day: "Wed",
    full: "Wednesday",
    train: "Day 3 · Legs A",
    veg: false,
    meals: [
      { id: "wed1", time: "08:00", slot: "Pre-workout", hl: true, items: "1 banana, 250 ml full-fat milk, 3 dates. Squat day - do not skip it.", kcal: 320, p: 11 },
      { id: "wed2", time: "10:40", slot: "Breakfast · post-workout", hl: true, items: "Oats day. 50 g oats cooked in 300 ml milk, whey scoop stirred in once it cools, 1 banana.", kcal: 700, p: 46 },
      { id: "wed3", time: "13:45", slot: "Lunch", items: "2 cups rice, 1 katori dal, 1 tsp ghee over the rice, 150 g curd.", kcal: 685, p: 20 },
      { id: "wed4", time: "16:45", slot: "Snack", items: "200 g curd with 1 tbsp honey, 20 g walnuts.", kcal: 380, p: 11 },
      { id: "wed5", time: "20:45", slot: "Dinner", items: "1.5 cups rice, your 150 g share of the chicken, 1 katori sabzi.", kcal: 710, p: 41 },
    ],
  },
  {
    day: "Thu",
    full: "Thursday",
    train: "Day 4 · Push B",
    veg: true,
    meals: [
      { id: "thu1", time: "08:00", slot: "Pre-workout", hl: true, items: "1 banana, 250 ml full-fat milk, 3 dates.", kcal: 320, p: 11 },
      { id: "thu2", time: "10:40", slot: "Breakfast · post-workout", hl: true, items: "1 scoop whey in 250 ml milk, then 2 chapatis with ghee and 1 katori sabzi.", kcal: 720, p: 43 },
      { id: "thu3", time: "13:45", slot: "Lunch", items: "1.5 cups rice, 1 katori dal, 1 katori sabzi, 1 tsp ghee, 150 g curd.", kcal: 640, p: 19 },
      { id: "thu4", time: "16:45", slot: "Snack", items: "Sattu drink - 40 g sattu in 250 ml milk - and 20 g almonds.", kcal: 430, p: 20 },
      { id: "thu5", time: "20:45", slot: "Dinner", items: "1.5 cups rice, 2 katori dal, 150 g curd. Dal twice again tonight.", kcal: 660, p: 28 },
    ],
  },
  {
    day: "Fri",
    full: "Friday",
    train: "Day 5 · Pull B",
    veg: false,
    meals: [
      { id: "fri1", time: "08:00", slot: "Pre-workout", hl: true, items: "1 banana, 250 ml full-fat milk, 3 dates. Deadlift day - do not skip it.", kcal: 320, p: 11 },
      { id: "fri2", time: "10:40", slot: "Breakfast · post-workout", hl: true, items: "1 scoop whey in 250 ml milk, then 2 chapatis with ghee and 1 katori sabzi.", kcal: 720, p: 43 },
      { id: "fri3", time: "13:45", slot: "Lunch", items: "1.5 cups rice, your 100 g share of the chicken, 1 katori dal.", kcal: 660, p: 33 },
      { id: "fri4", time: "16:45", slot: "Snack", items: "40 g makhana roasted in ghee, 20 g almonds, 200 ml milk.", kcal: 410, p: 12 },
      { id: "fri5", time: "20:45", slot: "Dinner", items: "2 cups rice, 1 katori dal, 1 katori sabzi, 150 g curd.", kcal: 670, p: 21 },
    ],
  },
  {
    day: "Sat",
    full: "Saturday",
    train: "Day 6 · Legs B",
    veg: false,
    meals: [
      { id: "sat1", time: "08:00", slot: "Pre-workout", hl: true, items: "1 banana, 250 ml full-fat milk, 3 dates.", kcal: 320, p: 11 },
      { id: "sat2", time: "10:40", slot: "Breakfast · post-workout", hl: true, items: "Oats day. 50 g oats cooked in 300 ml milk, whey scoop stirred in, 1 tbsp peanut butter.", kcal: 700, p: 47 },
      { id: "sat3", time: "13:45", slot: "Lunch", items: "2 cups rice, 1 katori dal, 1 tsp ghee over the rice, 150 g curd.", kcal: 685, p: 20 },
      { id: "sat4", time: "16:45", slot: "Snack", items: "2 slices brown bread with 2 tbsp peanut butter.", kcal: 410, p: 14 },
      { id: "sat5", time: "20:45", slot: "Dinner", items: "1.5 cups rice and your 150 g share of the chicken.", kcal: 600, p: 39 },
    ],
  },
  {
    day: "Sun",
    full: "Sunday",
    train: "Rest day · no whey",
    veg: false,
    meals: [
      { id: "sun1", time: "09:30", slot: "Breakfast", items: "3 chapatis with ghee, 1 katori sabzi, 150 g curd, 3 boiled eggs.", kcal: 830, p: 35 },
      { id: "sun2", time: "13:45", slot: "Lunch", items: "2 cups rice, your 150 g share of the chicken, 150 g curd.", kcal: 780, p: 44 },
      { id: "sun3", time: "17:00", slot: "Snack", items: "Seasonal fruit, 30 g mixed nuts, 250 ml milk.", kcal: 460, p: 15 },
      { id: "sun4", time: "20:30", slot: "Dinner", items: "1.5 cups rice, 1 katori dal, 1 katori sabzi, 150 g curd.", kcal: 670, p: 21 },
    ],
  },
];
