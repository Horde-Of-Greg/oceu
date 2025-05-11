import {
  parse_duration,
  get_tier_name,
  get_voltage_from_name,
  calculate_rates,
  parse_flag,
} from "./util.js";
import { run_recipe } from "./oceu.js";

function generate_table_web(data, recipe) {
  const table = document.querySelector("table");
  table.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("tr");
    const rates_flag = parse_flag(recipe.flags, "--rates");
    const cells = [
      `${item.eu} EU/t`,
      item.time > 20 ? `${item.time / 20}s` : `${item.time}t`,
      item.chance ? `${item.chance}%` : "",
      item.parallel ? `${item.parallel}x` : "",
      recipe.flags.includes("--ce") && item.tier == 9
        ? "MAX"
        : get_tier_name(item.tier),
      rates_flag ? calculate_rates(item, rates_flag) : "",
    ];
    cells.forEach((cellData) => {
      const td = document.createElement("td");
      td.textContent = cellData;
      row.appendChild(td);
    });
    table.appendChild(row);
  });
}

export function update_result() {
  const eu = parseInt(document.getElementById("recipe_eu").value);
  const time = parse_duration(document.getElementById("recipe_time").value);
  const chance = parseFloat(document.getElementById("recipe_chance").value);
  const chance_bonus = parseFloat(
    document.getElementById("recipe_chance_bonus").value,
  );
  const recipe_heat = parseInt(document.getElementById("recipe_heat").value);
  const coil_heat = parseInt(document.getElementById("recipe_coil_heat").value);
  const parallel = parseInt(document.getElementById("recipe_parallel").value);
  const voltage = get_voltage_from_name(
    document.getElementById("voltage").value,
  );

  let flags = [];
  if (voltage) {
    flags.push(`--filter:${get_tier_name(voltage)}`);
  }

  if (document.getElementById("lcr").checked) {
    flags.push("--lcr");
  }
  if (document.getElementById("config").checked) {
    flags.push("--config");
  }
  if (document.getElementById("ce").checked) {
    flags.push("--ce");
  }

  if (document.getElementById("extra").checked) {
    flags.push("--extra");
  }

  const rates = parseInt(document.getElementById("rates").value);
  const mats = parseInt(document.getElementById("mats").value);

  if (rates && mats) {
    flags.push(`--rates:${rates * mats}`);
  } else if (rates) {
    flags.push(`--rates:${rates}`);
  } else if (mats) {
    flags.push(`--rates:${mats}`);
  }
  console.log(flags);

  const recipe = {
    base_eu: eu,
    base_duration: time,
    base_chance: chance,
    base_chance_bonus: chance_bonus,
    base_recipe_heat: recipe_heat,
    base_coil_heat: coil_heat,
    base_parallel: parallel,
    flags: flags,
    oc_type: recipe_heat
      ? parallel
        ? "ebf parallel"
        : "ebf"
      : parallel
        ? "parallel"
        : "regular",
    amperage: 1,
  };

  try {
    if (eu && time) {
      const [recipe_, output] = run_recipe(recipe, {});
      generate_table_web(output, recipe);
    }
  } catch (error) {
    const table = document.querySelector("table");
    table.innerHTML = "";
    const td = document.createElement("td");
    td.textContent = `Error: ${error}`;
    table.appendChild(td);
  }
}

window.update_result = update_result;
