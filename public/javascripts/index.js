let recipe_storage = [];

function parse_flag(flags, flag) {
  const flag_data = find_flag(flags, flag);
  if (!flag_data) {
    return;
  }

  // skip the : between the flag and the value
  return flag_data.substring(flag.length + 1);
}

function get_tier_name(voltage) {
  const tier = voltage_tiers.find((t) => t.tier === voltage);
  return tier ? tier.name : null;
}

function format_rates(rates_s) {
  if (rates_s < 0.0001) {
    return (rates_s * 60 * 60).toFixed(2).toString() + "/h";
  } else if (rates_s < 0.01) {
    return (rates_s * 60).toFixed(2).toString() + "/min";
  } else {
    return rates_s.toFixed(2).toString() + "/s";
  }
}
function calculate_rates(output, rate_amount) {
  const amount = rate_amount || 1;
  output.amount = amount;

  let rate = (1 / (output.time / 20)) * amount;
  if (output.parallel) {
    rate = rate * output.parallel;
  }

  return format_rates(rate);
}
const voltage_tiers = [
  { tier: 0, name: "ULV", eu_threshold: 8 },
  { tier: 1, name: "LV", eu_threshold: 32 },
  { tier: 2, name: "MV", eu_threshold: 128 },
  { tier: 3, name: "HV", eu_threshold: 512 },
  { tier: 4, name: "EV", eu_threshold: 2048 },
  { tier: 5, name: "IV", eu_threshold: 8192 },
  { tier: 6, name: "LuV", eu_threshold: 32768 },
  { tier: 7, name: "ZPM", eu_threshold: 131072 },
  { tier: 8, name: "UV", eu_threshold: 524288 },
  { tier: 9, name: "UHV", eu_threshold: 2097152 },
  { tier: 10, name: "UEV", eu_threshold: 8388608 },
  { tier: 11, name: "UIV", eu_threshold: 33554432 },
  { tier: 12, name: "UXV", eu_threshold: 134217728 },
  { tier: 13, name: "OpV", eu_threshold: 536870912 },
  { tier: 14, name: "MAX", eu_threshold: 2147483648 },
];

function find_flag(flags, flag) {
  const data = flags.filter((value) => value.startsWith(flag));
  if (!data) {
    return;
  }
  return data[0];
}

function parse_duration(input) {
  // You can explicitly specify for ticks by suffixing the time with "t"
  if (input.endsWith("t")) {
    return Math.floor(parseInt(input));
  } else {
    return Math.floor(parseFloat(input) * 20);
  }
}

async function run_recipe(input) {
  return fetch('/api/calculate_overclock', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input),
  })
    .then(response => response.json())
}
async function generate_table(output, flags) {
  return fetch('/api/generate_table', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ outputs: output, flags: flags }),
  })
    .then(response => response.json())
}

function create_header(header, headerElement) {
  const th = $("<th>").text(header);
  $(headerElement).append(th);
}

function read_recipe() {
  const ELEMENT_IDS = {
    eu: "#recipe_eu",
    time: "#recipe_time",
    chance: "#recipe_chance",
    chance_bonus: "#recipe_chance_bonus",
    recipe_heat: "#recipe_heat",
    coil_heat: "#recipe_coil_heat",
    parallel: "#recipe_parallel",
    voltage: "#voltage",
    rates: "#rates",
    mats: "#mats",
    lcr: "#lcr",
    config: "#config",
    ce: "#ce",
    macerator_ce: "#macerator_ce",
    extra: "#extra",
    subtick: "#subtick",
    volcanus: "#volcanus",
  };

  const parse = (id, parser = parseFloat) => {
    const value = $(id).val();
    return parser(value || 0);
  };

  const eu = parse(ELEMENT_IDS.eu, parseInt);
  const time = parse_duration(parse(ELEMENT_IDS.time).toString());
  const chance = parse(ELEMENT_IDS.chance);
  const chanceBonus = parse(ELEMENT_IDS.chance_bonus);
  const recipeHeat = parse(ELEMENT_IDS.recipe_heat, parseInt);
  const coilHeat = parse(ELEMENT_IDS.coil_heat, parseInt);
  const parallel = parse(ELEMENT_IDS.parallel, parseInt);
  const voltage = $(ELEMENT_IDS.voltage).val();

  let flags = [];
  if (voltage) flags.push(`--voltage:${voltage}`);
  if ($(ELEMENT_IDS.lcr).is(":checked")) flags.push("--lcr");
  if ($(ELEMENT_IDS.config).is(":checked")) flags.push("--config");
  if ($(ELEMENT_IDS.ce).is(":checked")) flags.push("--ce");
  if ($(ELEMENT_IDS.extra).is(":checked")) flags.push("--extra");
  if ($(ELEMENT_IDS.macerator_ce).is(":checked")) flags.push("--macerator");
  if (recipeHeat && coilHeat) flags.push("--ebf");
  if (parallel) flags.push("--parallel");
  if ($(ELEMENT_IDS.volcanus).is(":checked")) {
    flags.push("--volcanus");
  }
  if ($(ELEMENT_IDS.subtick).is(":checked")){
    flags.push("--subtick");
    flags.push("--parallel");
  }

  const rates = parse(ELEMENT_IDS.rates, parseInt);
  const mats = parse(ELEMENT_IDS.mats, parseInt);

  if (rates || mats) {
    flags.push(`--rates`);
  }
  if (rates && mats) {
    flags.push(`--output:${rates * mats}`);
  } else if (rates) {
    flags.push(`--output:${rates}`);
  } else if (mats) {
    flags.push(`--output:${mats}`);
  }

  const recipe = {
    base_eu: eu,
    base_duration: time,
    base_chance: chance,
    base_chance_bonus: chanceBonus,
    base_recipe_heat: recipeHeat,
    base_coil_heat: coilHeat,
    base_parallel: parallel,
    flags: flags,
    amperage: 1,
  };

  if (flags.includes("--parallel") && !recipe.base_parallel){
    recipe.base_parallel = 1;
  }

  return recipe;
}


function create_rows(data, body, flags) {
  $(body).empty();
  const ratesFlag = find_flag(flags, "--rates");
  data.forEach((item) => {
    const row = $("<tr>");
    const cells = [
      `${item.eu} EU/t`,
      item.time > 20 ? `${item.time / 20}s` : `${item.time}t`,
      item.chance ? `${item.chance}%` : "",
      item.parallel ? `${item.parallel}x` : "",
      ratesFlag ? calculate_rates(item, parseInt(parse_flag(flags, "--output"))) : "",
      flags.includes("--ce") && item.tier == 9
        ? "MAX"
        : get_tier_name(item.tier),
    ];

    cells.forEach((cellData) => {
      if (cellData) {
        const td = $("<td>").text(cellData);
        row.append(td);
      }
    });

    $(body).append(row);
  });
}

function generate_table_web(data, recipe) {
  const table = $("#output_table tbody");
  const header = $("#output_table thead tr");

  const ratesFlag = find_flag(recipe.flags, "--rates");

  const headers = {
    base_eu: "EU Cost",
    base_duration: "Duration",
    base_chance: "Chance",
    base_parallel: "Parallel",
    _rates: ratesFlag ? "Rates" : "",
    _voltage: "Voltage",
  };

  $(header).empty();
  Object.entries(headers).forEach(([key, value]) => {
    if (recipe[key] || (value && key.startsWith("_"))) {
      create_header(value, header);
    }
  });

  create_rows(data, table, recipe.flags);
}

function update_result() {
  try {
    const recipe = read_recipe();
    if (recipe.base_eu && recipe.base_duration) {
      run_recipe(recipe).then(output => {
        generate_table_web(output, recipe)
      });
    }

    if ($("#recipe_heat").val() && $("#recipe_coil_heat").val()) {
      $("#volcanus_checkbox").show();
    } else {
      $("#volcanus_checkbox").hide();
    }
  } catch (error) {
    const table = $("#output_table tbody");
    const header = $("#output_table thead tr");

    $(table).empty();
    $(header).empty();

    const tr = $("<tr>");
    const td = $("<td>").text(`Error: ${error.message}`).css("color", "red");
    tr.append(td);
    table.append(tr);
  }
}

window.update_result = update_result;
