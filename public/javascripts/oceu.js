import {
  get_eu_t,
  get_voltage_tier,
  get_voltage_from_name,
  find_flag,
  parse_flag,
} from "./util.js";

function calculate_overclock(recipe, voltage) {

  const output = {
    parallel: null,
    chance: null,
    chance_bonus: null,
  };
  let base_eu = recipe.base_eu;
  const is_ce = find_flag(recipe.flags, "--ce");

  if (find_flag(recipe.flags, "--parallel")) {
    const parallel = Math.min(
      recipe.base_parallel,
      Math.floor((recipe.amperage * get_eu_t(voltage)) / recipe.base_eu),
    );
    base_eu = recipe.base_eu * parallel;
    output.parallel = parallel;
  }

  let overclock_tiers = Math.max(0, voltage - get_voltage_tier(base_eu, is_ce));
  let effective_eu = base_eu;
  let effective_time = recipe.base_duration;

  if (is_ce) {
    let oc_div = (base_eu <= 16) ? 2 : 2.8;
    let halves = Math.floor(Math.log(effective_time) / Math.log(oc_div));
    let overclock_count = Math.min(halves, overclock_tiers);
    effective_time = Math.max(
      1,
      Math.ceil(effective_time / Math.pow(oc_div, overclock_count)),
    );
    effective_eu = Math.floor(base_eu * Math.pow(4, overclock_count));

    let doubling_count;
    if (find_flag(recipe.flags, "--macerator")) {
      // Macerators in CE only start scaling in chanced outputs after MV
      doubling_count = voltage >= get_voltage_from_name("MV") ? overclock_tiers - 1 : overclock_tiers;
    } else {
      // CE fuckery
      doubling_count = voltage >= get_voltage_from_name("MV") ? overclock_tiers + 1 : overclock_tiers;
    }
    output.chance = Math.min(100, recipe.base_chance * Math.pow(2, doubling_count));

  } else {
    let effective_oc;
    if (find_flag(recipe.flags, "--lcr")) {
      effective_oc = Math.min(overclock_tiers, Math.ceil(Math.log(effective_time) / Math.log(4)));
      effective_eu = Math.floor(base_eu * Math.pow(4, effective_oc));
      effective_time = Math.max(
        1,
        Math.floor(recipe.base_duration / Math.pow(4, overclock_tiers)),
      );
    } else {
      effective_oc = Math.min(overclock_tiers, Math.ceil(Math.log(effective_time) / Math.log(2)));
      // Don't oc past tickcap if the user is not using parallel hatches 
      if (find_flag(recipe.flags, "--parallel")) {
        effective_eu = Math.floor(base_eu * Math.pow(4, overclock_tiers));
      } else {
        effective_eu = Math.floor(base_eu * Math.pow(4, effective_oc));
      }

      effective_time = Math.max(
        1,
        Math.floor(recipe.base_duration / Math.pow(2, overclock_tiers)),
      );
    }
    output.chance = Math.min(
      100,
      recipe.base_chance + recipe.base_chance_bonus * overclock_tiers,
    );
    if (find_flag(recipe.flags, "--subtick") && overclock_tiers > effective_oc) {
      output.parallel = output.parallel * Math.pow(2, overclock_tiers - effective_oc)
    }
  }

  if (find_flag(recipe.flags, "--config")) {
    effective_time = Math.floor(effective_time * 0.9);
  }

  const time_multiplier = parseFloat(parse_flag(recipe.flags, "--time"));
  const eu_multiplier = parseFloat(parse_flag(recipe.flags, "--eu"));
  if (time_multiplier) {
    effective_time = Math.floor(effective_time * time_multiplier);
  }
  if (eu_multiplier) {
    effective_eu = Math.floor(effective_eu * eu_multiplier);
  }

  output.tier = voltage;
  output.eu = effective_eu;
  output.time = effective_time;
  output.chance_bonus = recipe.base_chance_bonus;

  return output;
}

function calculate_ebf_overclock(recipe, voltage) {
  // Null out the fields we don't use
  const output = {
    parallel: null,
    chance: null,
    chance_bonus: null,
  };

  // EBF behaviour in CE is identical to singleblocks
  if (find_flag(recipe.flags, "--ce")) {
    return calculate_overclock(recipe, voltage);
  }

  let base_eu = recipe.base_eu;

  if (find_flag(recipe.flags, "--parallel")) {
    parallel = Math.min(
      recipe.base_parallel,
      Math.floor((recipe.amperage * get_eu_t(voltage)) / recipe.base_eu),
    );
    base_eu = recipe.base_eu * parallel;
    //Same thing as regular oc

    output.parallel = parallel;
  }

  function ebf_eu_discount(recipeHeat, effectiveHeat) {
    return Math.pow(0.95, Math.floor((effectiveHeat - recipeHeat) / 900));
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

  let effective_eu =
    base_eu *
    ebf_eu_discount(recipe.base_recipe_heat, effective_heat) *
    Math.pow(4, overclock_tiers);


  let effective_time =
    recipe.base_duration /
    Math.pow(4, Math.min(overclock_tiers, ebf_perfect_overclocks)) /
    Math.pow(2, Math.max(0, overclock_tiers - ebf_perfect_overclocks));
  //We first spend our ocs on perfect oc, if we have ocs left, then we do regular oc

  if (find_flag(recipe.flags, "--config")) {
    effective_time = Math.floor(effective_time * 0.9);
  }

  const time_multiplier = parseFloat(parse_flag(recipe.flags, "--time"));
  const eu_multiplier = parseFloat(parse_flag(recipe.flags, "--eu"));
  if (time_multiplier) {
    effective_time = Math.floor(effective_time * time_multiplier);
  }
  if (eu_multiplier) {
    effective_eu = Math.floor(effective_eu * eu_multiplier);
  }

  output.eu = Math.floor(effective_eu);
  output.time = Math.max(1, Math.floor(effective_time));
  output.tier = voltage;
  return output;
}

export function run_recipe(recipe) {
  const eu_tier = get_voltage_tier(
    recipe.base_eu,
    find_flag(recipe.flags, "--ce")
  );
  const output = [];
  const voltage_flag = parse_flag(recipe.flags, "--filter");

  let voltage = -1;

  if (voltage_flag) {
    voltage = get_voltage_from_name(voltage_flag);
    if (!voltage) {
      throw new Error(`${voltage_flag} is not a vaild voltage`);
    }
  }

  if (find_flag(recipe.flags, "--ebf")) {

    if (voltage != -1) {
      output.push(calculate_ebf_overclock(recipe, voltage));
      return;
    }

    if (find_flag(recipe.flags, "--extra")) {
      if (find_flag(recipe.flags, "--ce")) {
        throw new Error(
          "Nomifactory CE does not have UEV+ Voltage, voltages in Nomifactory caps to MAX (sames as UHV)",
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
  } else {
    if (voltage != -1) {
      output.push(calculate_overclock(recipe, voltage));
      return;
    }

    if (find_flag(recipe.flags, "--extra")) {
      if (find_flag(recipe.flags, "--ce")) {
        throw new Error(
          "Nomifactory CE does not have UEV+ Voltage, voltages in Nomifactory caps to MAX (sames as UHV)",
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
  }

  return [recipe, output];
}
