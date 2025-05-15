import { parse_duration } from "./util.js";
export function check_recipe(recipe) {
  if (recipe.base_eu < 0) {
    throw new Error("EU cost must be positive");
  }
  if (recipe.base_duration <= 0) {
    throw new Error("Recipe duration must be positive");
  }
  if (recipe.base_chance < 0 || recipe.base_chance_bonus < 0) {
    throw new Error("Recipe chance must be positive");
  }

  if (recipe.base_chance > 100 || recipe.base_chance_bonus > 100) {
    throw new Error("Recipe chance must be smaller than 100%");
  }
  if (recipe.parallel < 0) {
    throw new Error("Recipe parallel must be positive");
  }
  if (recipe.amperage < 0) {
    throw new Error("Recipe amperage must be positive");
  }

  if (
    (recipe.base_recipe_heat || recipe.base_coil_heat) &&
    !(recipe.base_recipe_heat && recipe.base_coil_heat)
  ) {
    throw new Error(
      "Both recipe temperature and coil temperature must be provided",
    );
  }
}

export function parse_input(input) {
  try {
    let json = JSON.parse(input);
    if (json.length === 1) {
      json = json[0];
    }

    check_recipe(json);
    console.log(json);
    return json;
  } catch {}

  input = input.split(" ");

  const flags = input.filter((value) => value != "-" && value.startsWith("--"));
  input = input
    .filter((value) => !value.startsWith("--"))
    .map((value) => (value != "-" ? value : null));

  if (input.length < 2) {
    throw new Error("Too few arguments: Must have at least 2");
  }
  let output = {};

  if (input[0] === "ebf") {
    const oc_type = input[5] ? "ebf parallel" : "ebf";

    output = {
      base_eu: Math.floor(parseInt(input[1])),
      base_duration: Math.floor(parse_duration(input[2])),
      base_recipe_heat: parseInt(input[3]),
      base_coil_heat: parseInt(input[4]),
      base_parallel: parseInt(input[5] ?? 0),
      amperage: parseInt(input[6] ?? 1),
      flags: flags,
      oc_type: oc_type,
    };
  } else {
    const oc_type = input[4] ? "parallel" : "regular";

    output = {
      base_eu: Math.floor(parseInt(input[0])),
      base_duration: parse_duration(input[1]),
      base_chance: parseFloat(input[2] ?? 0),
      base_chance_bonus: parseFloat(input[3] ?? 0),
      base_parallel: parseInt(input[4] ?? 0),
      amperage: parseInt(input[5] ?? 1),
      flags: flags,
      oc_type: oc_type,
    };
  }

  check_recipe(output);
  return output;
}
