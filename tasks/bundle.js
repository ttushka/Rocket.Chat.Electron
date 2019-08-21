const builtinModules = require('builtin-modules');
const jetpack = require('fs-jetpack');
const path = require('path');
const { rollup } = require('rollup');
const babel = require('rollup-plugin-babel');
const commonjs = require('rollup-plugin-commonjs');
const globImport = require('rollup-plugin-glob-import');
const istanbul = require('rollup-plugin-istanbul');
const json = require('rollup-plugin-json');
const nodeResolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');
const url = require('rollup-plugin-url');
const svgr = require('@svgr/rollup').default;
const appManifest = require('../package.json');


const cached = {};

const bundle = async (src, dest, { coverage = false, env = 'development' } = {}) => {
	const inputOptions = {
		input: src,
		external: [
			...builtinModules,
			...Object.keys(appManifest.dependencies),
			...Object.keys(appManifest.devDependencies),
		],
		cache: cached[src],
		plugins: [
			...(coverage ? [
				istanbul({
					exclude: ['**/*.spec.js', '**/*.specs.js'],
					sourcemap: true,
				}),
			] : []),
			url({
				limit: 1024 * 1024,
				include: ['src/**/*.jpg', 'src/**/*.png'],
			}),
			svgr({
				svgoConfig: {
					plugins: {
						removeViewBox: false,
					},
				},
			}),
			json(),
			replace({
				'process.env.BUGSNAG_API_KEY': JSON.stringify(process.env.BUGSNAG_API_KEY),
				'process.env.NODE_ENV': JSON.stringify(env),
			}),
			globImport(),
			babel(),
			nodeResolve({
				extensions: ['.js', '.jsx', '.json'],
			}),
			commonjs(),
		],
	};

	const outputOptions = {
		format: 'cjs',
		file: dest,
		intro: '(function () {',
		outro: '})()',
		sourcemap: true,
		sourcemapFile: path.basename(dest),
	};

	const bundle = await rollup(inputOptions);
	cached[src] = bundle;
	await bundle.write(outputOptions);
};

const bundleMany = async (srcDirPath, matching, dest, options) => {
	const srcDir = jetpack.cwd(srcDirPath);
	const src = srcDir.path(path.basename(dest));

	const entryFileContent = (await srcDir.findAsync({ matching }))
		.map((path) => `import './${ path.replace(/\\/g, '/') }';`)
		.join('\n');

	await jetpack.writeAsync(src, entryFileContent);
	await bundle(src, dest, options);
	await jetpack.removeAsync(src);
};

module.exports = bundle;
module.exports.many = bundleMany;
