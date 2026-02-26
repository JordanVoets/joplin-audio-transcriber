import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const manifestPath = path.join(rootDir, 'src', 'manifest.json');

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, data, indent) => {
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, indent)}\n`, 'utf8');
};

const parseVersion = version => {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
	if (!match) return null;
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
	};
};

const formatVersion = parts => `${parts.major}.${parts.minor}.${parts.patch}`;

const bumpVersion = (version, bump) => {
	const parts = parseVersion(version);
	if (!parts) throw new Error(`Invalid version: ${version}`);

	switch (bump) {
		case 'major':
			parts.major += 1;
			parts.minor = 0;
			parts.patch = 0;
			break;
		case 'minor':
			parts.minor += 1;
			parts.patch = 0;
			break;
		case 'patch':
			parts.patch += 1;
			break;
		default:
			throw new Error(`Unknown bump type: ${bump}`);
	}

	return formatVersion(parts);
};

const input = process.argv[2];
if (!input) {
	console.error('Usage: node scripts/bump-version.js <major|minor|patch|x.y.z>');
	process.exit(1);
}

const packageJson = readJson(packageJsonPath);
const manifest = readJson(manifestPath);

let resolvedVersion = '';

if (parseVersion(input)) {
	resolvedVersion = input;
} else if (['major', 'minor', 'patch'].includes(input)) {
	resolvedVersion = bumpVersion(packageJson.version, input);
} else {
	console.error(`Unsupported version input: ${input}`);
	process.exit(1);
}

packageJson.version = resolvedVersion;
manifest.version = resolvedVersion;

writeJson(packageJsonPath, packageJson, 2);
writeJson(manifestPath, manifest, '\t');

console.log(resolvedVersion);
