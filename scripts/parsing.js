import { find_flag, parse_duration, voltage_tiers } from "./util.js";
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
  } if (recipe.amperage < 0) {
    throw new Error("Recipe amperage must be positive");
  }

  if (
    (recipe.base_recipe_heat || recipe.base_coil_heat) &&
    !(recipe.base_recipe_heat && recipe.base_coil_heat)) {
    throw new Error(
      "Both recipe temperature and coil temperature must be provided",
    );
  }
}

export function parse_input(input) {
  if (input.includes("--auto")){
    return JSON.parse(input.replace("--auto", ""))
  }

  input = input.split(" ");

  if (input.length < 2) {
    throw new Error("Too few arguments: Must have at least 2");
  }

  const flags = input.filter((value) => value != "-" && value.startsWith("--"));

  input = input .filter((value) => !value.startsWith("--")) .map((value) => (value != "-" ? value : null));

  if (find_flag(flags, "--input") || find_flag(flags, "--output")) {
    flags.push("--rates");
  }

  for (let i = 0; i < voltage_tiers.length; i++) {
    if (find_flag(flags, `--${voltage_tiers[i].name.toLowerCase()}`)) {
      flags.push(`--voltage:${voltage_tiers[i].name.toLowerCase()}`)
    }
  }

  let output = {};

  if (input[0] === "ebf") {
    flags.push("--ebf");
    if (input[5] || flags.includes("--subtick")) {
      flags.push("--parallel")
    }

    output = {
      base_eu: Math.floor(parseInt(input[1])),
      base_duration: Math.floor(parse_duration(input[2])),
      base_recipe_heat: parseInt(input[3]),
      base_coil_heat: parseInt(input[4]),
      base_parallel: parseInt(input[5] ?? 1), amperage: parseInt(input[6] ?? 1),
      flags: flags,
    };

    if (flags.includes("--volcanus")) {
      output.flags.push("--time:0.45454545")
      output.flags.push("--eu:0.9")
      output.flags.push("--parallel")
      output.base_parallel = 8;
    }

  } else {
    if ((input[4] || flags.includes("--subtick"))) {
      flags.push("--parallel")
    }

    output = {
      base_eu: Math.floor(parseInt(input[0])),
      base_duration: parse_duration(input[1]),
      base_chance: parseFloat(input[2] ?? 0),
      base_chance_bonus: parseFloat(input[3] ?? 0),
      base_parallel: parseInt(input[4] ?? 1),
      amperage: parseInt(input[5] ?? 1),
      flags: flags,
    };

    if (flags.includes("--cryo-freezer")) {
      output.flags.push("--time:0.5")
      output.flags.push("--parallel")
      output.base_parallel = 4;
    }
  }

  check_recipe(output);

  return output;
}
