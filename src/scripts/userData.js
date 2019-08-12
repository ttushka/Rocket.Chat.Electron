import { remote } from 'electron';
import jetpack from 'fs-jetpack';


const { app } = remote;

export const readUserDataFile = (path, returnAs = 'utf8') =>
	jetpack.cwd(app.getPath('userData'))
		.readAsync(path, returnAs);

export const readAppDataFile = (path, returnAs = 'utf8') =>
	jetpack.cwd(app.getAppPath(), app.getAppPath().endsWith('app.asar') ? '..' : '.')
		.readAsync(path, returnAs);

export const writeUserDataFile = (path, data) =>
	jetpack.cwd(app.getPath('userData'))
		.writeAsync(path, data, { atomic: true });
