var parsing = require('./parsing.js');
var overclock = require('./overclock.js');
var gen_table = require('./gen_table.js');

var express = require('express');
var router = express.Router();

router.post('/parse_input', function(req, res, next) {
  res.json(parsing.parse_input(req.body.args))
});
router.post('/calculate_overclock', function(req, res, next) {
  res.json(overclock.run_recipe(req.body))
});
router.post('/generate_table', function(req, res, next) {
  res.json(gen_table.generate_table(req.body.outputs, req.body.flags))
});

module.exports = router;
