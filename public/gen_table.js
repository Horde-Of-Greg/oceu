import { parse_flag, get_tier_name, calculate_rates } from "./util.js";

export function generate_table(outputs, flags) {
  // Initialize lengths for each column
  let eu_length = 3,
    time_length = 0,
    tier_length = 3,
    parallel_length = 1,
    chance_length = 0,
    rates_length = 6;

  const needs_chance = outputs[0].chance,
    needs_parallel = outputs[0].parallel,
    rates_flag = parse_flag(flags, "--rates");

  // Calculate maximum lengths for each column for padding
  outputs.forEach((row) => {
    eu_length = Math.max(row.eu.toString().length, eu_length);
    time_length = Math.max((row.time / 20).toString().length, time_length);
    if (needs_chance) {
      chance_length = Math.max(row.chance.toString().length, chance_length);
    }
    if (needs_parallel) {
      parallel_length = Math.max(
        row.parallel.toString().length,
        parallel_length,
      );
    }

    row.amount = 1;
    if (rates_flag) {
      recipe.rates = calculate_rates(row, rates_flag);
      rates_length = Math.max(row.rates.toString().length, rates_length);
    }
  });

  // Define unit suffixes and separator
  const separator = " | ";

  let table = outputs
    .map((row) => {
      let entry = generate_entry(row.eu, " EU/t", separator, eu_length);
      if (row.time >= 20) {
        entry += generate_entry(row.time / 20, "s", separator, time_length);
      } else {
        entry += generate_entry(row.time, "t", separator, time_length);
      }
      // Use ticks if time < 1s

      if (needs_chance) {
        entry += generate_entry(row.chance, " %", separator, chance_length);
      }
      if (needs_parallel) {
        entry += generate_entry(row.parallel, "x", separator, parallel_length);
      }
      if (rates_flag) {
        entry += generate_entry(row.rates, "", separator, rates_length);
      }

      // UHV in CEu == MAX in CE
      if (flags.includes("--ce") && row.tier == 9) {
        entry += generate_entry("MAX", "", "", tier_length);
      } else {
        entry += generate_entry(get_tier_name(row.tier), "", "", tier_length);
      }

      return entry;
    })
    .join("\n");

  return table;
}

// Helper function to format each entry
function generate_entry(value, unit_suffix, separator, length) {
  value = value.toString();
  if (value.length >= length) {
    return `${value}${unit_suffix}${separator}`;
  }
  const padding_needed = length - value.length;
  return `${value}${unit_suffix}${" ".repeat(padding_needed)}${separator}`;
}
