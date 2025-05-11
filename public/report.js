import { get_ratios, parse_flag } from "./util.js";
import { run_recipe } from "./oceu.js";

export function generate_report(recipes) {
  let output = {};
  let results = [];
  const production_rates = [];

  recipes.forEach((element) => {
    if (element) {
      const arr = run_recipe(element);
      const recipe = arr[0],
        output = arr[1];
      results.push(output);

      const rates_flag = parse_flag(recipe.flags, "--rates");

      let amount = 1 / (output[0].time / 20);
      if (rates_flag) {
        amount = amount * rates_flag;
      }
      if (output[0].parallel) {
        amount = amount * output[0].parallel;
      }
      production_rates.push(amount);
    }
  });

  // total production rates = slowest of all machines
  const production_speed = Math.min(...production_rates);
  if (production_speed < 0.01) {
    output.production_speed = `${(production_speed * 60).toFixed(2)}/min`;
    output.bottleneck = `${production_rates.indexOf(production_speed) + 1}`;
  } else {
    output.production_speed = `${production_speed.toFixed(2)}/s`;
    output.bottleneck = `${production_rates.indexOf(production_speed) + 1}`;
  }

  const ratios = get_ratios(production_rates);
  output.ratios = ratios.join(":");

  return [results, output];
}
