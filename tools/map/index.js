const fs = require('fs');
const os = require('os');
const yaml = require('yaml-js');
const math = require('mathjs');

const CLUTTER_DISTANCE = 2;
const MAX_COORDINATE = 499;

const regionBlacklist = ['A821-A', 'UUA-F4'];

const map = [
	'static_galaxy_scenario = {',
	'\tname = "New Eden"',
	'\tcolonizable_planet_odds = 1.0',
	'\tpriority = 0',
	'\tdefault = yes',
	'\tnum_empires = { min = 1 max = 32 }',
	'\tnum_empire_default = 3',
	'\tadvanced_empire_default = 0',
	'\tfallen_empire_default = 2',
	'\tfallen_empire_max = 2',
	'\tcore_radius = 0',
	'\trandom_hyperlanes = no',
];

const hyperlanes = [];

const gateToSystemMap = {};

const addedHyperlanes = {};

const extremes = {
	minX: 0,
	maxX: 0,
	minY: 0,
	maxY: 0,
};

const systemBoard = {};

for (let i = -MAX_COORDINATE; i <= MAX_COORDINATE; i++) {
	systemBoard[i] = {};

	for (let j = -MAX_COORDINATE; j <= MAX_COORDINATE; j++) {
		systemBoard[i][j] = [];
	}
}

function addSystem(id, name, x, y) {
	//const initializer = name.toLowerCase().replace('-', '_')+'_system_initializer';

	//map.push(`\tsystem = { id = "${id}" name = "${name.replace(/([a-z])([A-Z])/g, '$1 $2')}" position = { x = ${x} y = ${y} } initializer = "${initializer}" }`);
	map.push(`\tsystem = { id = "${id}" name = "${name.replace(/([a-z])([A-Z])/g, '$1 $2')}" position = { x = ${x} y = ${y} } }`);
}

function addHyperlane(from, to) {
	map.push(`\tadd_hyperlane = { from = "${from}" to = "${to}" }`);
}

function updateCoordinates(line, ratios, index) {
	const coordinates = {};

	const newCoordinates = line.replace(/[xy]\s=\s-?\d+\s/g, match => {
		const matchSplit = match.trim().split(' = ');

		matchSplit[1] = math.multiply(math.bignumber(matchSplit[1]), ratios[matchSplit[0]]).round(0).toString();

		coordinates[matchSplit[0]] = parseInt(matchSplit[1]);

		return matchSplit.join(' = ')+' ';
	});

	//console.log('adding to board', coordinates.x, coordinates.y, index);

	systemBoard[coordinates.x][coordinates.y].push(index);

	return newCoordinates;
}

function updateExtremes(x, y) {
	if (x > extremes.maxX) {
		extremes.maxX = x;
	}
	else if (x < extremes.minX) {
		extremes.minX = x;
	}

	if (y > extremes.maxY) {
		extremes.maxY = y;
	}
	else if (y < extremes.minY) {
		extremes.minY = y;
	}
}

function calcClutter(x, y) {
	const xStart = Math.max(x - CLUTTER_DISTANCE, -MAX_COORDINATE);
	const xEnd = Math.min(x + CLUTTER_DISTANCE, MAX_COORDINATE);
	const yStart = Math.max(y - CLUTTER_DISTANCE, -MAX_COORDINATE);
	const yEnd = Math.min(y + CLUTTER_DISTANCE, MAX_COORDINATE);

	const clutter = {
		x: 0,
		y: 0,
	};

	for (let i = xStart; i <= xEnd; i++)
		for (let j = yStart; j <= yEnd; j++) {
			if (i == x && j == y)
				continue;

			if (systemBoard[i][j].length) {
				const clutterDistance = {
					x: i - x,
					y: j - y,
				};

				clutter.x = clutter.x ? (Math.abs(clutterDistance.x) < Math.abs(clutter.x) ? clutterDistance.x : clutter.x) : clutterDistance.x;
				clutter.y = clutter.y ? (Math.abs(clutterDistance.y) < Math.abs(clutter.y) ? clutterDistance.y : clutter.y) : clutterDistance.y;
			}
		}

	return clutter;
}

function findDeclutterDest(x, y, declutter, noShift) {
	const xStart = Math. max(x - CLUTTER_DISTANCE + declutter.x, -MAX_COORDINATE);
	const xEnd = Math.min(x + CLUTTER_DISTANCE + declutter.x, MAX_COORDINATE);
	const yStart = Math.max(y - CLUTTER_DISTANCE + declutter.y, -MAX_COORDINATE);
	const yEnd = Math.min(y + CLUTTER_DISTANCE + declutter.y, MAX_COORDINATE);

	for (let i = xStart; i <= xEnd; i++)
		for (let j = yStart; j <= yEnd; j++) {
			if (i == x && j == y)
				continue;

			const destClutter = calcClutter(i, j);

			if (!destClutter.x && !destClutter.y) {
				return {x: i, y: j};
			}
		}
}

function declutterPoint(x, y) {
	if (!systemBoard[x] || !systemBoard[x][y]) {
		//console.log('not on board', x, y);
		return;
	}

	const numSystems = systemBoard[x][y].length;

	if (!numSystems) {
		//console.log('board field empty', x, y, systemBoard[x][y]);
		return;
	}

	//console.log(map[systemBoard[x][y][0]]);

	const clutter = calcClutter(x, y);

	if (clutter.x || clutter.y) {
		const declutter = {
			x: -Math.sign(clutter.x) * (Math.abs(clutter.x) == 1 ? 2 : 1),
			y: -Math.sign(clutter.y) * (Math.abs(clutter.y) == 1 ? 2 : 1),
		};

		const dest = findDeclutterDest(x, y, declutter);

		if (dest) {
			console.log('declutter', x, y, 'to', dest.x, dest.y, map[systemBoard[x][y][0]]);
			systemBoard[dest.x][dest.y] = systemBoard[x][y];
			systemBoard[x][y] = [];

			x = dest.x;
			y = dest.y;
		}
		else {
			console.log('Unable to declutter', map[systemBoard[x][y][0]]);
			return;
		}
	}
	/*else {
		console.log('no clutter', x, y);
	}*/

	systemBoard[x][y].forEach(index => {
		map[index] = map[index].replace(/[xy]\s=\s-?\d+\s/g, match => {
			const matchSplit = match.trim().split(' = ');

			const dest = {x, y};

			matchSplit[1] = dest[matchSplit[0]];

			return matchSplit.join(' = ')+' ';
		});
	});


	//while (systemBoard[x][y].length > 1) {
	/*if (systemBoard[x][y].length > 1) {
		console.log('Overlapping systems', x, y);
	}*/
}

const regions = fs.readdirSync('fsd/universe/eve');

regions.forEach(region => {
	if (regionBlacklist.includes(region)) {
		return;
	}

	const regionPath = 'fsd/universe/eve/'+region;

	const constellations = fs.readdirSync(regionPath);

	const regionYaml = fs.readFileSync(regionPath+'/region.staticdata');

	const regionData = yaml.load(regionYaml);

	constellations.forEach(constellation => {
		if (constellation == 'region.staticdata') {
			return;
		}

		const constellationPath = regionPath+'/'+constellation;

		const systems = fs.readdirSync(constellationPath);

		const constellationYaml = fs.readFileSync(constellationPath+'/constellation.staticdata');

		const constellationData = yaml.load(constellationYaml);

		systems.forEach(system => {
			if (system == 'constellation.staticdata') {
				return
			}

			const systemYaml = fs.readFileSync(constellationPath+'/'+system+'/solarsystem.staticdata');

			const systemData = yaml.load(systemYaml);

			const x = - (regionData.center[0] + 2 * constellationData.center[0] + 5 * systemData.center[0]);
			const y = - (regionData.center[2] + 2 * constellationData.center[2] + 5 * systemData.center[2]);

			addSystem(systemData.solarSystemID, system, x, y);

			updateExtremes(x, y);

			Object.keys(systemData.stargates).forEach(key => {
				const dest = systemData.stargates[key].destination;

				gateToSystemMap[key] = systemData.solarSystemID;

				if (addedHyperlanes[dest+'_'+key]) {
					return;
				}

				hyperlanes.push([key, systemData.stargates[key].destination+'']);

				addedHyperlanes[key+'_'+dest] = true;
			});	
		});
	});
});

const ratios = {
	x: math.divide(math.bignumber(MAX_COORDINATE), math.bignumber(Math.max(Math.abs(extremes.minX), Math.abs(extremes.maxX)))),
	y: math.divide(math.bignumber(MAX_COORDINATE), math.bignumber(Math.max(Math.abs(extremes.minY), Math.abs(extremes.maxY)))),
};

map.forEach((line, index) => {
	if (line.startsWith('\tsystem')) {
		map[index] = updateCoordinates(line, ratios, index);
	}
});


for (let i = -MAX_COORDINATE; i <= MAX_COORDINATE; i++) {
	for (let j = -MAX_COORDINATE; j <= MAX_COORDINATE; j++) {
		declutterPoint(i, j);
	}
}

hyperlanes.forEach(hyperlane => {
	addHyperlane(gateToSystemMap[hyperlane[0]+''], gateToSystemMap[hyperlane[1]+'']+'');
});

map.push('}');

fs.writeFileSync('../../eve_base/map/setup_scenarios/new_eden.txt', map.join(os.EOL));