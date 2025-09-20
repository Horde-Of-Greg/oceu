## Data Structures
### Recipe
Defines a GT recipe, with EU and Recipe time, all times are in ticks.

Regular Recipes:
```js
{
    "base_eu": Number,
    "base_duration": Number,
    "base_chance": Number,
    "base_chance_bonus": Number,
    "base_parallel": Number,
    "amperage": Number,
    "flags": [Object Array],
} ```

EBF Recipes: (pass `--ebf` flag):
```js
{
    "base_eu": Number,
    "base_duration": Number ,
    "base_recipe_heat": Number,
    "base_coil_heat": Number,
    "base_parallel": Number,
    "amerage": Number,
    "flags": [Object Array],
}
```

### Output
Stores the results of overclocking, unused fields are left null. `tier` is a tier indicating the energy tier the recipe is ran at, starting at 1 for LV.
```js
    {
        "parallel": Number,
        "chance": Number,
        "chance_bonus": Number,
        "eu": Number,
        "time": Number,
        "tier": Number
    }
```

## Flags
- `--ebf`: Indicates an EBF recipe.
- `--parallel`: Indicates parallel mechanics are used, also set `recipe.base_parallel` to configure the parallel count.
- `--ce`: Emulates GTCE behaviour, with 2.8x overclocking and chance doubling per overclock.
- `--macerator`: Emulates GTCE Macerator behaviour for chanced outputs
- `--subtick`: Enables subtick overclocking, with parallel count doubled once the recipe time reached 1t.
- `--time:[multiplier]`: Adds a multiplier to the recipe time.
- `--eu:[multiplier]`: Adds a multiplier to the recipe eu/t cost.
- `--extra`: Outputs extra tiers from UHV to MAX.
- `--filter:[voltage]`: Only shows result from a specified voltage.
- `--tick`: (Only used to generate tables) Displays time in ticks only.
- `--rates`: Shows the rate of production (recipe/s) in the generated table.
- `--output:[number]`: Multiplies the rates of production by `number`.
- `--input:[number]`: Multiplies the input rates (same as the rate of production by default) by `number`.


## API

`POST /api/parse_input`: Parses the input string into the `recipe` type, similiar to the command line argument style for `%t oceu`
: Parameters:
: - `args: String`: the actual command line arguments
: Returns: `Recipe`: the parsed recipe

 
`POST /api/calculate_overclock`: Computes the eu cost and time required for each voltage tier, given a GT recipe.
: Parameters: `Recipe`: the required recipe.
: Returns: `Array [Output]`: the computed result sorted by voltage tier.



`POST /api/generate_table`: Generates a string table given a array of computed overclock results.
: Parameters: 
: - `flags: Array [String]`: the input flags required, see [flags](#Flags).
: - `outputs: Array [Outputs]`: the computed results.
: Returns: `String`: the formatted table.
