export const voltage_tiers = [
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

export function format_rates(rates_s) {
  if (rates_s < 0.0001) {
    return (rates_s * 60 * 60).toFixed(2).toString() + "/h";
  } else if (rates_s < 0.01) {
    return (rates_s * 60).toFixed(2).toString() + "/min";
  } else {
    return rates_s.toFixed(2).toString() + "/s";
  }
}
export function calculate_rates(output, rate_amount) {
  const amount = rate_amount || 1;
  output.amount = amount;

  let rate = (1 / (output.time / 20)) * amount;
  if (output.parallel) {
    rate = rate * output.parallel;
  }

  return format_rates(rate);
}

export function get_tier_name(voltage) {
  const tier = voltage_tiers.find((t) => t.tier === voltage);
  return tier ? tier.name : null;
}

export function get_voltage_from_name(name) {
  const voltage = voltage_tiers.find((t) => t.name === name);
  return voltage ? voltage.tier : null;
}

export function get_eu_t(voltage) {
  return Math.pow(4, voltage - 1) * 32;
}

export function find_flag(flags, flag) {
  const data = flags.filter((value) => value.startsWith(flag));
  if (!data) {
    return;
  }
  return data[0];
}

export function parse_flag(flags, flag) {
  const flag_data = find_flag(flags, flag);
  if (!flag_data) {
    return;
  }

  if (flag_data.startsWith("--rates")) {
    return flag_data.substring(flag.length + 1);
  }

  // skip the : between the flag and the value
  return flag_data.substring(flag.length + 1);
}

export function get_voltage_tier(eu_cost, ce) {
  for (const tier of voltage_tiers) {
    if (eu_cost <= tier.eu_threshold) {
      if (!ce && tier.tier == 0) {
        return 1;
      }
      return tier.tier;
    }
  }
}

export function parse_duration(input) {
  // You can explicitly specify for ticks by suffixing the time with "t"
  if (input.endsWith("t")) {
    return Math.floor(parseInt(input));
  } else {
    return Math.floor(parseFloat(input) * 20);
  }
}

export function get_ratios(numbers) {
  const min_number = Math.min(...numbers);
  const scaled = numbers.map((num) => num / min_number);
  const ratios = scaled.map((num) => parseFloat(num.toFixed(2)));

  return ratios;
}

export function get_downclocks(parallel) {
  if (parallel < 4) return 0;
  if (parallel < 16) return 1;
  if (parallel < 64) return 2;
  if (parallel < 256) return 3;
  return 4; // parallel >= 256
}
