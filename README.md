# stellaris_eve
Eve Online themed mods for Stellaris

This is a monorepo for multiple mods and tools used to develop them.


# dev data reference

## sizes

These are based on Sol in vanilla Stellaris and 4 empire homeworlds from Eve Online

### rocky plents up to 15 km radius

| size units	| km		|
| ------------- | --------- |
| 12			| 2980		|
| 13			| 3250		|
| 13			| 3320		|
| 13			| 3350		|
| 13			| 3390		|
| 14			| 3750		|
| 14			| 3800		|
| 15			| 4030		|
| 15			| 4080		|
| 15			| 4350		|
| 16			| 5050		|
| 17			| 5450		|
| 18			| 5760		|
| 20			| 6010		|
| 20			| 6052		|
| 20			| 6290		|
| 21			| 7710		|
| 22			| 7890		|
| 23			| 8200		|
| 25			| 9910		|
| 25			| 9990		|
| 25			| 10960		|
| 28			| 13530		|

approximate formula: -9.06643×10^-8 * x^2 + 0.00301605 * x + 3.84235

### gas giants

| size units	| km		|
| ------------- | --------- |
| 15			| 14300		|
| 17			| 18260		|
| 20			| 24622		|
| 20			| 25362		|
| 23			| 30217		|
| 25			| 37753		|
| 28			| 47700		|
| 30			| 58232		|
| 35			| 69911		|

approxmate formula: -1.8963×10^-9 * x^2 + 0.000499516 * x + 8.62074