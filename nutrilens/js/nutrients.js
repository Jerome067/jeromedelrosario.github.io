// Nutrient reference: plain-language explanations plus how each one is judged.
// kind: "range"  – aim for a healthy band (calories, carbs, fat, protein)
//       "limit"  – less is better; stay under the line (sodium, saturated fat…)
//       "target" – aim to reach at least this much (fiber, vitamins, minerals)

export const NUTRIENTS = [
  {
    id: "calories", label: "Calories", short: "Calories", unit: "kcal", icon: "flame", kind: "range",
    what: "A measure of the energy a food provides.",
    does: "Calories fuel everything your body does, from breathing and thinking to walking and exercising. Energy you don't use is stored for later, mostly as body fat.",
    tip: "Your needs depend on your size, age and how active you are. Set up your profile for a personal number.",
  },
  {
    id: "fat", label: "Total fat", short: "Fat", unit: "g", icon: "droplet", kind: "range",
    what: "All the fats in the food added together: saturated, trans and the unsaturated kinds.",
    does: "Fat is a concentrated energy source, helps you absorb vitamins A, D, E and K, and is part of every cell. Unsaturated fats (olive oil, nuts, fish) support heart health.",
    tip: "The type of fat matters more than the total. Favour unsaturated fats over saturated and trans fats.",
  },
  {
    id: "satFat", label: "Saturated fat", short: "Sat. fat", unit: "g", icon: "droplet", kind: "limit", parent: "fat",
    what: "A type of fat that is solid at room temperature, common in butter, cheese, fatty meats, coconut and palm oil.",
    does: "Eating a lot of it can raise LDL (\"bad\") cholesterol, which over time is linked with heart disease.",
    tip: "Guidelines suggest keeping it under 10% of your daily calories.",
  },
  {
    id: "transFat", label: "Trans fat", short: "Trans fat", unit: "g", icon: "droplet", kind: "limit", parent: "fat",
    what: "A type of fat mostly made when liquid oils are partially hydrogenated; small amounts occur naturally in meat and dairy.",
    does: "Raises LDL cholesterol and lowers HDL (\"good\") cholesterol, so it is the least heart-friendly fat.",
    tip: "Keep it as low as you reasonably can. The WHO suggests under 1% of daily calories.",
  },
  {
    id: "cholesterol", label: "Cholesterol", short: "Cholesterol", unit: "mg", icon: "heart", kind: "limit",
    what: "A waxy substance found only in animal foods such as eggs, meat and dairy.",
    does: "Your body uses it to build cells and make hormones, and makes most of what it needs itself. For most people, saturated fat affects blood cholesterol more than dietary cholesterol does.",
    tip: "300 mg a day is the long-standing reference value used on labels.",
  },
  {
    id: "sodium", label: "Sodium", short: "Sodium", unit: "mg", icon: "salt", kind: "limit",
    what: "A mineral mostly eaten as salt (sodium chloride). Most comes from packaged and restaurant foods, not the salt shaker.",
    does: "Helps balance fluids and lets nerves and muscles work. Regularly eating too much can raise blood pressure.",
    tip: "Adults are advised to stay under 2,300 mg a day (about one teaspoon of salt).",
  },
  {
    id: "carbs", label: "Total carbohydrate", short: "Carbs", unit: "g", icon: "wheat", kind: "range",
    what: "Starches, sugars and fiber combined.",
    does: "Carbohydrates are your body's main and quickest source of energy, especially for your brain and muscles.",
    tip: "Whole grains, fruit, vegetables and legumes give you carbs plus fiber, vitamins and minerals.",
  },
  {
    id: "fiber", label: "Dietary fiber", short: "Fiber", unit: "g", icon: "leaf", kind: "target", parent: "carbs",
    what: "The part of plant foods your body can't fully digest.",
    does: "Keeps digestion regular, feeds helpful gut bacteria, helps you feel full and supports steady blood sugar and healthy cholesterol.",
    tip: "Most people eat less than they need. Beans, oats, fruit, vegetables and whole grains are great sources.",
  },
  {
    id: "sugars", label: "Total sugars", short: "Sugars", unit: "g", icon: "candy", kind: "limit", parent: "carbs",
    what: "All sugars in the food: those naturally found in fruit and milk plus any added during processing.",
    does: "Sugars are a quick source of energy. Natural sugars in whole fruit and milk come packaged with fiber, protein or nutrients.",
    tip: "There's no official limit for total sugars in the US; we compare against the EU/UK reference intake of 90 g. Added sugars is the more useful number to watch.",
  },
  {
    id: "addedSugars", label: "Added sugars", short: "Added sugar", unit: "g", icon: "candy", kind: "limit", parent: "carbs",
    what: "Sugars and syrups put into food during processing or preparation, such as table sugar, honey and corn syrup.",
    does: "They add energy and sweetness but few nutrients. Eating a lot regularly is linked with weight gain, tooth decay and a higher risk of type 2 diabetes.",
    tip: "Guidelines suggest keeping added sugars under 10% of daily calories.",
  },
  {
    id: "protein", label: "Protein", short: "Protein", unit: "g", icon: "egg", kind: "range",
    what: "Made of amino acids, the building blocks of your body.",
    does: "Builds and repairs muscle, skin and organs, and makes enzymes, hormones and antibodies. It also helps you feel full.",
    tip: "A common baseline is 0.8 g per kg of body weight each day. Active people often need more.",
  },
  {
    id: "vitD", label: "Vitamin D", short: "Vitamin D", unit: "mcg", icon: "sun", kind: "target",
    what: "A vitamin your skin makes in sunlight, also found in fatty fish, eggs and fortified foods.",
    does: "Helps you absorb calcium for strong bones and supports muscles and the immune system.",
    tip: "Hard to get from food alone, so fortified foods help.",
  },
  {
    id: "calcium", label: "Calcium", short: "Calcium", unit: "mg", icon: "bone", kind: "target",
    what: "The most plentiful mineral in your body, found in dairy, fortified plant milks, tofu and leafy greens.",
    does: "Builds and maintains bones and teeth, and helps muscles contract and nerves send signals.",
    tip: "Needs go up for teens and older adults.",
  },
  {
    id: "iron", label: "Iron", short: "Iron", unit: "mg", icon: "magnet", kind: "target",
    what: "A mineral found in meat, beans, lentils, spinach and fortified cereals.",
    does: "Helps red blood cells carry oxygen around your body. Low iron can leave you tired.",
    tip: "Women aged 19–50 need more than twice as much as men. Vitamin C helps absorb iron from plants.",
  },
  {
    id: "potassium", label: "Potassium", short: "Potassium", unit: "mg", icon: "banana", kind: "target",
    what: "A mineral found in fruit, vegetables, beans, potatoes and dairy.",
    does: "Helps balance fluids, keeps your heartbeat steady and can help offset the effect of sodium on blood pressure.",
    tip: "Many people fall short. Bananas, potatoes, beans and leafy greens are good sources.",
  },
];

export const NUTRIENT_BY_ID = Object.fromEntries(NUTRIENTS.map((n) => [n.id, n]));

// Standard US label Daily Values (2,000 kcal), used to convert "%DV" when only a percentage is printed.
export const LABEL_DV = {
  fat: 78, satFat: 20, cholesterol: 300, sodium: 2300, carbs: 275, fiber: 28,
  addedSugars: 50, protein: 50, vitD: 20, calcium: 1300, iron: 18, potassium: 4700,
};
