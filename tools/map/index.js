const fs = require('fs');
const os = require('os');
const yaml = require('yaml-js');
const math = require('mathjs');

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

function addSystem(id, name, x, y) {
	const initializer = name.toLowerCase().replace('-', '_')+'_system_initializer';

	map.push(`\tsystem = { id = "${id}" name = "${name.replace(/([a-z])([A-Z])/g, '$1 $2')}" position = { x = ${x} y = ${y} } initializer = "${initializer}" }`);
}

function addHyperlane(from, to) {
	map.push(`\tadd_hyperlane = { from = "${from}" to = "${to}" }`);
}

function updateCoordinates(line, ratio) {
	return line.replace(/[xy]\s=\s([-?][\d+])\s/g, match => math.multiply(math.bignumber(match) * ratio));
}

const regions = fs.readdirSync('fsd/universe/eve');

const hyperlanes = [];

const gateToSystemMap = {};

const addedHyperlanes = {};

const extremes = {
	minX: 0,
	maxX: 0,
	minY: 0,
	maxY: 0,
};

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

regions.forEach(region => {
	if (regionBlacklist.includes(region)) {
		return;
	}

	const regionPath = 'fsd/universe/eve/'+region;

	const constellations = fs.readdirSync(regionPath);

	constellations.forEach(constellation => {
		if (constellation == 'region.staticdata') {
			return;
		}

		const constellationPath = regionPath+'/'+constellation;

		const systems = fs.readdirSync(constellationPath);

		systems.forEach(system => {
			if (system == 'constellation.staticdata') {
				return
			}

			const systemYaml = fs.readFileSync(constellationPath+'/'+system+'/solarsystem.staticdata');

			const systemData = yaml.load(systemYaml);

			addSystem(systemData.solarSystemID, system, systemData.center[0], systemData.center[1]);

			updateExtremes(systemData.center[0], systemData.center[1]);

			Object.keys(systemData.stargates).forEach(key => {
				const dest = systemData.stargates[key].destination;

				if (addedHyperlanes[dest+'_'+key]) {
					return;
				}

				hyperlanes.push([key, systemData.stargates[key].destination+'']);

				gateToSystemMap[key] = systemData.solarSystemID;

				addedHyperlanes[key+'_'+dest] = true;
			});	
		});
	});
});

const coordinateConversionRatio = math.divide(math.bignumber(499), math.bignumber(Math.max(Math.abs(extremes.minX), Math.abs(extremes.maxX), Math.abs(extremes.minY), Math.abs(extremes.maxY))));

map.forEach((line, index) => {
	if (line.startsWith('\tsystem')) {
		map[index] = updateCoordinates(line, coordinateConversionRatio);
	}
});

hyperlanes.forEach(hyperlane => {
	addHyperlane(gateToSystemMap[hyperlane[0]], gateToSystemMap[hyperlane[1]]);
});

map.push('}');

fs.writeFileSync('../../eve_base/map/setup_scenarios/new_eden.txt', map.join(os.EOL));