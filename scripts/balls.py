def success_chance(failrate, attempts):
    chance_of_success = 1.0
    for attempt in range(1, int(attempts)):
        chance_of_success *= 1 - float(failrate)
    return f"Your chance of success is {round(chance_of_success*100, 5)}%"
print(success_chance(input("Chance of failure per attempt as a decimal\n"), input("Number of Attempts\n")))
