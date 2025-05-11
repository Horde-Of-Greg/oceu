import {
  get_eu_t,
  voltage_tiers,
  get_tier_name,
  get_voltage_tier,
  get_voltage_from_name,
  find_flag,
  parse_flag,
  parse_duration,
  get_ratios,
  get_downclocks,
} from "./util.js";
/* 
Basically a rewrite of %t oceu with support for parallel hatches. Grace yourself to my (not as bad) code.
Harass smallming._ if you encounter any bugs / want to extend the functionally of this,
%t oldceu contains the old version of %t oceu before this revamp.

All time will be in ticks.

Types:
recipe: {
    base_eu: 
    base_duration: 
    base_chance: 
    base_chance_bonus: 
    base_recipe_heat: 
    base_coil_heat: 
    flags:
    oc_type: 
};

*/

function calculate_overclock(recipe, voltage) {
  const output = {
    parallel: null,
    chance: null,
    chance_bonus: null,
  };
  // Null out the fields we don't use

  let base_eu = recipe.base_eu;
  const is_ce = recipe.flags.includes("--ce");

  if (recipe.oc_type.includes("parallel")) {
    const parallel = Math.min(
      recipe.base_parallel,
      Math.floor((recipe.amperage * get_eu_t(voltage)) / recipe.base_eu),
    );
    base_eu = recipe.base_eu * parallel;
    // We first parallel by modifying `parallel` and `base_eu` before we oc
    output.parallel = parallel;
  }

  let overclock_tiers = Math.max(0, voltage - get_voltage_tier(base_eu, is_ce));

  let effective_eu = Math.floor(base_eu * Math.pow(4, overclock_tiers));
  let effective_time = recipe.base_duration;

  if (is_ce) {
    if (base_eu >= 16) {
      let effective_eu = base_eu;
      let overclock_count = 0;
      while (
        Math.floor(effective_time / 2.8) > 1 &&
        overclock_count < overclock_tiers
      ) {
        effective_time = Math.ceil(effective_time / 2.8);
        effective_eu = effective_eu * 4;

        overclock_count += 1;
      }
    } else {
      effective_time = Math.floor(
        Math.max(1, recipe.base_duration / Math.pow(2, overclock_tiers)),
      );
    }
  } else if (recipe.flags.includes("--lcr")) {
    effective_time = Math.floor(
      Math.max(1, recipe.base_duration / Math.pow(4, overclock_tiers)),
    );
  } else {
    effective_time = Math.floor(
      Math.max(1, recipe.base_duration / Math.pow(2, overclock_tiers)),
    );
  }

  if (recipe.flags.includes("--config")) {
    effective_time = Math.floor(effective_time * 0.9);
  }

  output.tier = voltage;
  output.eu = effective_eu;
  output.time = effective_time;
  output.chance = recipe.flags.includes("--ce")
    ? Math.min(100, recipe.base_chance * Math.pow(2, overclock_tiers))
    : Math.min(
        100,
        recipe.base_chance + recipe.base_chance_bonus * overclock_tiers,
      );
  output.chance_bonus = recipe.base_chance_bonus;

  return output;
}

function calculate_ebf_overclock(recipe, voltage) {
  const output = {
    parallel: null,
    chance: null,
    chance_bonus: null,
  };
  // Null out the fields we don't use

  // EBF behaviour in CE is identical to single blocks
  if (recipe.flags.includes("--ce")) {
    return calculate_overclock(recipe, voltage);
  }

  let base_eu = recipe.base_eu;

  if (recipe.oc_type.includes("parallel")) {
    parallel = Math.floor(
      recipe.base_parallel,
      Math.floor((recipe.amperage * get_eu_t(voltage)) / recipe.base_eu),
    );
    base_eu = recipe.base_eu * parallel;
    //Same thing as regular oc

    output.parallel = parallel;
  }

  function ebf_eu_discount(recipeHeat, effectiveHeat) {
    return Math.pow(0.95, Math.floor((effectiveHeat - recipeHeat) / 900));
    // Apply a 95% discount every 900K in coil temp
  }

  let eu_tier = get_voltage_tier(
    base_eu * ebf_eu_discount(recipe.base_recipe_heat, recipe.base_coil_heat),
    false,
  );

  const recipe_voltage = get_voltage_tier(
    get_eu_t(voltage) * recipe.amperage - 1,
    false,
  );

  const overclock_tiers = recipe_voltage - eu_tier;

  const effective_heat = recipe.base_coil_heat + (recipe_voltage - 2) * 100;
  const ebf_perfect_overclocks = Math.floor(
    (effective_heat - recipe.base_recipe_heat) / 1800,
  );

  eu_tier = get_voltage_tier(
    base_eu * ebf_eu_discount(recipe.base_recipe_heat, effective_heat),
    false,
  );
  // Recalculate the voltage tier we are running considering the coil heat increase from oc

  const effective_eu =
    base_eu *
    ebf_eu_discount(recipe.base_recipe_heat, effective_heat) *
    Math.pow(4, overclock_tiers);

  const effective_time =
    recipe.base_duration /
    Math.pow(4, Math.min(overclock_tiers, ebf_perfect_overclocks)) /
    Math.pow(2, Math.max(0, overclock_tiers - ebf_perfect_overclocks));
  //We first spend our ocs on perfect oc, if we have ocs left, then we do regular oc

  if (recipe.flags.includes("--config")) {
    effective_time = Math.floor(effective_time * 0.9);
  }

  output.eu = Math.floor(effective_eu);
  output.time = Math.max(1, Math.floor(effective_time));
  output.tier = voltage;
  return output;
}

export function run_recipe(recipe, options) {
  if (options.pre_flags) {
    recipe.flags = recipe.flags.concat(options.pre_flags);
  }

  const eu_tier = get_voltage_tier(
    recipe.base_eu,
    recipe.flags.includes("--ce"),
  );
  const output = [];
  const voltage_flag = parse_flag(recipe.flags, "--filter");
  let voltage = -1;

  if (voltage_flag) {
    voltage = get_voltage_from_name(voltage_flag);
    if (!voltage) {
      throw new Error(
        `\`${voltage}\` is not a vaild voltage, --filter:<voltage> must a vaild voltage`,
      );
    }
  }

  switch (recipe.oc_type) {
    case "regular":
    case "parallel":
      if (voltage != -1) {
        output.push(calculate_overclock(recipe, voltage));
        break;
      }

      if (recipe.flags.includes("--extra")) {
        if (recipe.flags.includes("--ce")) {
          throw new Error(
            "Nomifactory CE does not have UEV+ Voltage, voltages in Nomifactory caps to MAX",
          );
        }
        for (let index = eu_tier; index <= 14; index++) {
          output.push(calculate_overclock(recipe, index));
        }
      } else {
        for (let index = eu_tier; index <= 9; index++) {
          output.push(calculate_overclock(recipe, index));
        }
      }
      break;

    case "ebf":
    case "ebf parallel":
      if (voltage != -1) {
        output.push(calculate_ebf_overclock(recipe, voltage));
        break;
      }

      if (recipe.flags.includes("--extra")) {
        if (recipe.flags.includes("--ce")) {
          throw new Error(
            "Nomifactory CE does not have UEV+ Voltage, voltages in Nomifactory caps to MAX",
          );
        }
        for (let index = eu_tier; index <= 14; index++) {
          output.push(calculate_ebf_overclock(recipe, index));
        }
      } else {
        for (let index = eu_tier; index <= 9; index++) {
          output.push(calculate_ebf_overclock(recipe, index));
        }
      }
      break;
  }

  return [recipe, output];
}
