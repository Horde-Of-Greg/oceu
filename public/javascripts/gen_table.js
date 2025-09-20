import { parse_flag, find_flag, get_tier_name, calculate_rates } from "./util.js";

export function generate_table(outputs, flags) {
  if (flags.includes("--balls")) {
    return "Balls";
  }
  if (find_flag(flags, "--auto")) {
    return JSON.stringify(outputs);
  }

  // Initialize lengths for each column
  let eu_length = 3,
    time_length = 3,
    tier_length = 3,
    parallel_length = 7,
    chance_length = 5,
    rates_length = 6;
  input_length = 6;

  const needs_chance = outputs[0].chance,
    needs_parallel = outputs[0].parallel,
    rates_flag = find_flag(flags, "--rates"),
    input_flag = parse_flag(flags, "--input"),
    output_flag = parse_flag(flags, "--output");
  machine_count = parse_flag(flags, "--count") || 1;

  // Calculate maximum lengths for each column for padding
  outputs.forEach((row) => {
    eu_length = Math.max((row.eu * machine_count).toString().length, eu_length);
    time_length = Math.max(
      (row.time / 20).toString().length,
      row.time.toString().length,
      time_length,
    );
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
      if (input_flag) {
        row.input_rates = calculate_rates(row, input_flag * machine_count);
        input_length = Math.max(row.input_rates.toString().length, input_length);
      }
      row.rates = calculate_rates(row, (output_flag || 1) * machine_count);
      rates_length = Math.max(row.rates.toString().length, rates_length);
    }
  });

  // Define unit suffixes and separator
  const separator = " │ ";

  let table = outputs
    .map((row) => {
      let entry = generate_entry(row.eu * machine_count, " EU/t", separator, eu_length);
      // Use ticks if time < 1s
      if (find_flag(flags, "--tick") || row.time < 20) {
        entry += generate_entry(row.time, "t", separator, time_length);
      } else {
        entry += generate_entry(row.time / 20, "s", separator, time_length);
      }
      if (needs_chance) {
        entry += generate_entry(row.chance, "%", separator, chance_length);
      }
      if (needs_parallel) {
        entry += generate_entry(row.parallel, "x", separator, parallel_length);
      }
      if (input_flag) {
        entry += generate_entry(row.input_rates, "", separator, input_length);
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

  eu_length += 5;
  let header = generate_entry("EU/t", "", separator, eu_length);
  header += generate_entry("Time", "", separator, time_length + 1);
  if (needs_chance) {
    header += generate_entry("Chance", "", separator, chance_length);
  }
  if (needs_parallel) {
    header += generate_entry("Parallel", "", separator, parallel_length);
  }
  if (input_flag) {
    header += generate_entry("Input", "", separator, input_length);
    header += generate_entry("Output", "", separator, rates_length);
  } else if (rates_flag) {
    header += generate_entry("Rates", "", separator, rates_length);
  }
  header += generate_entry("Tier", "", "", tier_length);
  header += "\n";

  header += "─".repeat(eu_length + 1);
  header += "┼";
  header += "─".repeat(time_length + 3);
  header += "┼";

  if (needs_chance) {
    header += "─".repeat(chance_length + 3);
    header += "┼";
  }
  if (needs_parallel) {
    header += "─".repeat(parallel_length + 3);
    header += "┼";
  }
  if (input_flag) {
    header += "─".repeat(input_length + 2);
    header += "┼";
  }
  if (rates_flag) {
    header += "─".repeat(rates_length + 2);
    header += "┼";
  }


  header += "─".repeat(5);
  header += "\n";
  header += table;

  return header;
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
