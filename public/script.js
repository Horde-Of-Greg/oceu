import {
  parse_duration,
  get_tier_name,
  get_voltage_from_name,
  calculate_rates,
  parse_flag,
} from "./util.js";
import { generate_report } from "./report.js";
import { run_recipe } from "./oceu.js";

function generate_table_web(data, recipe) {
  const table = document.querySelector("#output_table tbody");
  const header = document.querySelector("#output_table thead tr");

  const rates_flag = parse_flag(recipe.flags, "--rates");
  table.innerHTML = "";
  header.innerHTML = "";

  [
    "EU Cost",
    "Duration",
    data[0].chance ? "Chance" : "",
    data[0].parallel ? "Parallel" : "",
    rates_flag ? "Rates" : "",
    "Voltage",
  ].forEach((item) => {
    const th = document.createElement("th");
    if (item) {
      th.textContent = item;
      header.appendChild(th);
    }
  });

  data.forEach((item) => {
    const row = document.createElement("tr");
    row.scope = "row";

    const cells = [
      `${item.eu} EU/t`,
      item.time > 20 ? `${item.time / 20}s` : `${item.time}t`,
      item.chance ? `${item.chance}%` : "",
      item.parallel ? `${item.parallel}x` : "",
      rates_flag ? calculate_rates(item, rates_flag) : "",
      recipe.flags.includes("--ce") && item.tier == 9
        ? "MAX"
        : get_tier_name(item.tier),
    ];
    cells.forEach((cellData) => {
      if (cellData) {
        const td = document.createElement("td");
        td.textContent = cellData;
        row.appendChild(td);
      }
    });
    table.appendChild(row);
  });
}

function read_recipe() {
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

  return recipe;
}

export function update_result() {
  const recipe = read_recipe();

  try {
    if (recipe.base_eu && recipe.base_duration) {
      const [recipe_, output] = run_recipe(recipe);
      generate_table_web(output, recipe);
    }
  } catch (error) {
    const table = document.querySelector("table");
    table.innerHTML = "";
    const td = document.createElement("td");
    td.textContent = `${error}`;
    table.appendChild(td);
  }
}

export function load_recipe_to_view(recipes) {
  const table = document.getElementById("recipe_table");
  table.innerHTML = "";

  recipes.forEach((item) => {
    if (item.base_eu && item.base_duration) {
      const row = document.createElement("tr");
      const cells = [
        `${item.base_eu} EU/t`,
        `${item.base_duration / 20}s`,
        item.chance ? `${item.base_chance}%` : "",
        item.parallel ? `${item.base_parallel}x` : "",
      ];

      cells.forEach((cell_data) => {
        const td = document.createElement("td");
        td.textContent = cell_data;
        row.appendChild(td);
      });
      table.appendChild(row);
    }
  });
}

window.update_result = update_result;
let recipe_storage = [];

document.getElementById("bulk_add_button").addEventListener("click", () => {
  const recipe = read_recipe();

  if (recipe) {
    recipe_storage.push(recipe);
    load_recipe_to_view(recipe_storage);
  }
});

document.getElementById("gen_report_button").addEventListener("click", () => {
  const report_table = document.querySelector("#report_table tbody");
  const report_headers = document.querySelector("#report_table thead tr");
  const report = generate_report(recipe_storage)[1];

  report_table.innerHTML = "";
  report_headers.innerHTML = "";

  let production_speed = document.createElement("th");
  let bottleneck = document.createElement("th");
  let ratios = document.createElement("th");

  production_speed.textContent = "Production Rates";
  bottleneck.textContent = "Bottleneck";
  ratios.textContent = "Ratios";

  report_headers.appendChild(production_speed);
  report_headers.appendChild(bottleneck);
  report_headers.appendChild(ratios);

  production_speed = document.createElement("td");
  bottleneck = document.createElement("td");
  ratios = document.createElement("td");

  production_speed.textContent = report.production_speed;
  bottleneck.textContent = report.bottleneck;
  ratios.textContent = report.ratios;

  report_table.appendChild(production_speed);
  report_table.appendChild(bottleneck);
  report_table.appendChild(ratios);
});
