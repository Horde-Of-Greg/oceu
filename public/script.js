import { parse_duration, get_tier_name } from "./util.js";
import { run_recipe } from "./oceu.js";

function generate_table_web(data, flags) {
  const table = document.querySelector("table");
  table.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("tr");
    const cells = [
      `${item.eu} EU/t`,
      item.time > 20 ? `${item.time / 20}s` : `${item.time}t`,
      item.chance ? `${item.chance}%` : "",
      item.parallel ? `${item.parallel}x` : "",
      flags.includes("--ce") && item.tier == 9
        ? "MAX"
        : get_tier_name(item.tier),
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
  let flags = [];

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

  if (rates) {
    flags.push(`--rates:${rates}`);
  }

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
      generate_table_web(output, recipe.flags);
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
