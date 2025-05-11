import express from "express";
import path from "path";
import { createServer } from "https";
import { readFileSync } from "fs";
import { parse_input } from "./public/parsing.js";
import { run_recipe } from "./public/oceu.js";
import { generate_table } from "./public/gen_table.js";
import { parse_duration } from "./public/util.js";
const app = express();

const privateKey = readFileSync("localhost-key.pem", "utf8");
const certificate = readFileSync("localhost.pem", "utf8");

const passphrase = "bruh";
const credentials = { key: privateKey, passphrase, cert: certificate };

const httpsServer = createServer(credentials, app);

function ensureSecure(req, res, next) {
  if (req.secure) {
    return next();
  }
  res.redirect("https://" + req.hostname + req.originalUrl);
}

app.use(ensureSecure);
const port = process.env.PORT || 443;

app.use(express.json());
app.use(express.static("public"));

app.post("/api/parse_input", (req, res) => {
  res.json(parse_input(req.body.input));
});

app.post("/api/overclock", (req, res) => {
  const [recipe, output] = run_recipe(req.body, {});
  res.json(output);
});

app.post("/api/gen_table", (req, res) => {
  res.json(generate_table(req.body.recipe, req.body.flags));
});

// Start the server
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

httpsServer.listen(443, () => {
  console.log("HTTPS server running on port 443");
});
