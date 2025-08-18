import {
  parse_duration,
  get_tier_name,
  get_voltage_from_name,
  calculate_rates,
  parse_flag,
} from "./util.js";
import { generate_report } from "./report.js";
import { run_recipe } from "./oceu.js";
import { check_recipe } from "./parsing.js";

let recipe_storage = [];

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
  if (voltage) {
    flags.push(`--filter:${voltage}`);
  }

  if ($(ELEMENT_IDS.lcr).is(":checked")) flags.push("--lcr");
  if ($(ELEMENT_IDS.config).is(":checked")) flags.push("--config");
  if ($(ELEMENT_IDS.ce).is(":checked")) flags.push("--ce");
  if ($(ELEMENT_IDS.extra).is(":checked")) flags.push("--extra");
  if ($(ELEMENT_IDS.macerator_ce).is(":checked")) flags.push("--macerator");

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

  console.log(flags)
  const recipe = {
    base_eu: eu,
    base_duration: time,
    base_chance: chance,
    base_chance_bonus: chanceBonus,
    base_recipe_heat: recipeHeat,
    base_coil_heat: coilHeat,
    base_parallel: parallel,
    flags: flags,
    oc_type: recipeHeat
      ? parallel
        ? "ebf parallel"
        : "ebf"
      : parallel
        ? "parallel"
        : "regular",
    amperage: 1,
  };

  check_recipe(recipe);

  return recipe;
}

function load_nth_recipe_to_input(index) {
  const recipe = recipe_storage[index];
  $("#recipe_eu").val(recipe.base_eu);
  $("#recipe_time").val(recipe.base_duration / 20);
  $("#recipe_chance").val(recipe.base_chance);
  $("#recipe_chance_bonus").val(recipe.base_chance_bonus);
  $("#recipe_heat").val(recipe.base_recipe_heat);
  $("#recipe_coil_heat").val(recipe.base_coil_heat);
  $("#recipe_parallel").val(recipe.base_parallel);
  $("#rates").val(recipe.rates);
  $("#lcr").prop("checked", recipe.flags.includes("--lcr"));
  $("#config").prop("checked", recipe.flags.includes("--config"));
  $("#ce").prop("checked", recipe.flags.includes("--ce"));
  $("#extra").prop("checked", recipe.flags.includes("--extra"));
}

function create_rows(data, body, flags) {
  $(body).empty();
  const ratesFlag = parse_flag(flags, "--rates");

  data.forEach((item) => {
    const row = $("<tr>");
    const cells = [
      `${item.eu} EU/t`,
      item.time > 20 ? `${item.time / 20}s` : `${item.time}t`,
      item.chance ? `${item.chance}%` : "",
      item.parallel ? `${item.parallel}x` : "",
      ratesFlag ? calculate_rates(item, ratesFlag) : "",
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
      const [recipe_, output] = run_recipe(recipe);
      generate_table_web(output, recipe);
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

function load_recipe_to_view(recipes) {
  const table = $("#recipe_table tbody");
  const header = $("#recipe_table thead tr");

  const labels = {
    _: "#",
    name: "Name",
    base_eu: "EU Cost",
    base_duration: "Duration",
    base_chance: "Chance",
    base_parallel: "Parallel",
    base_recipe_heat: "Recipe Heat",
    base_coil_heat: "Coil Heat",
  };

  $(header).empty();
  $(table).empty();
  $("#recipe_button_container").css("display", "block");

  Object.entries(labels).forEach(([key, value]) => {
    if (recipes.some((recipe) => recipe[key]) || key.startsWith("_")) {
      create_header(value, header);
    }
  });

  let selected_row = null;

  recipes.forEach((item, index) => {
    const row = $("<tr>");

    const checkboxCell = $("<td>");
    const checkbox = $("<input>")
      .attr("type", "checkbox")
      .addClass("form-check-input")
      .addClass("row-checkbox");

    checkboxCell.append(checkbox);
    row.append(checkboxCell);

    const cells = {
      name: item.name,
      base_eu: `${item.base_eu} EU/t`,
      base_duration:
        item.base_duration < 20
          ? `${item.base_duration}t`
          : `${item.base_duration / 20}s`,
      base_chance: item.base_chance ? `${item.base_chance}%` : "",
      base_parallel: item.base_parallel ? `${item.base_parallel}x` : "",
      base_recipe_heat: item.base_recipe_heat
        ? `${item.base_recipe_heat}K`
        : "",
      base_coil_heat: item.base_coil_heat ? `${item.base_coil_heat}K` : "",
    };

    Object.values(cells).forEach((cellData) => {
      if (cellData) {
        const td = $("<td>").text(cellData);
        row.append(td);
      }
    });

    row.click(() => {
      load_nth_recipe_to_input(index);
    });

    table.append(row);
  });
}

$("#bulk_add_button").click(() => {
  const name = $("#recipe_name").val();
  const recipe = read_recipe();
  recipe.name = name || `Recipe ${recipe_storage.length + 1}`;
  if (recipe) {
    recipe_storage.push(recipe);
    load_recipe_to_view(recipe_storage);
  }
});

$("#gen_report_button").click(() => {
  const reportTable = $("#report_table tbody");
  const reportHeaders = $("#report_table thead tr");
  const report = generate_report(recipe_storage)[1];

  $(reportTable).empty();
  $(reportHeaders).empty();

  const headers = ["Production Rates", "Bottleneck", "Ratios"];
  headers.forEach((header) => create_header(header, reportHeaders));

  const row = $("<tr>");
  const productionSpeed = $("<td>").text(report.production_speed);
  const bottleneck = $("<td>").text(report.bottleneck);
  const ratios = $("<td>").text(report.ratios);

  row.append(productionSpeed, bottleneck, ratios);
  reportTable.append(row);
});

$("#select-all").click(function() {
  const allChecked =
    $(".row-checkbox:checked").length === $(".row-checkbox").length;
  $(".row-checkbox").prop("checked", !allChecked);
});

$("#delete-selected").click(function() {
  $(".row-checkbox:checked").each(function() {
    const row = $(this).closest("tr");
    recipe_storage.splice(row.rowIndex, 1);
    row.remove();
  });
  if ($(".row-checkbox").length === 0) {
    $("#recipe_button_container").attr("style", "display: none !important");
    $("#recipe_table thead tr th").remove();
  }
});

function copy_to_clipboard(text) {
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val(text).select();
  document.execCommand("copy");
  $temp.remove();
}
function get_from_clipboard() {
  navigator.clipboard.readText().then((text) => {
    return text;
  });
}

$("#export-recipes").click(function() {
  copy_to_clipboard(JSON.stringify(recipe_storage));
  alert("Exported recipes to clipboard");
});

$("#import-recipes").click(function() {
  navigator.clipboard.readText().then((clipboard) => {
    recipe_storage = JSON.parse(clipboard);
    load_recipe_to_view(recipe_storage);
    alert("Imported recipes from clipboard");
  });
});

window.update_result = update_result;
