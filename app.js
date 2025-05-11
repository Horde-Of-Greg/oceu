import express from "express";
import path from "path";
import { createServer } from "https";
import { readFileSync } from "fs";
import { parse_input } from "./public/parsing.js";
import { run_recipe } from "./public/oceu.js";
import { generate_table } from "./public/gen_table.js";
import { parse_duration } from "./public/util.js";
import { generate_report } from "./public/report.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

app.post("/api/parse_input", (req, res) => {
  console.log(req.body, req.data);
  res.json(parse_input(req.body));
});

app.post("/api/overclock", (req, res) => {
  const [recipe, output] = run_recipe(req.body, {});
  res.json(output);
});

app.post("/api/gen_table", (req, res) => {
  res.json(generate_table(req.body.recipe, req.body.flags));
});

app.post("/api/gen_report", (req, res) => {
  res.json(generate_report(req.body));
});

// Start the server
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
