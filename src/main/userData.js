import { app, ipcMain } from 'electron';
import jetpack from 'fs-jetpack';
import path from 'path';


const setupUserDataPath = () => {
	const appName = app.getName();
	const dirName = process.env.NODE_ENV === 'production' ? appName : `${ appName } (${ process.env.NODE_ENV })`;

	app.setPath('userData', path.join(app.getPath('appData'), dirName));
};

const resetUserData = () => {
	const dataDir = app.getPath('userData');
	jetpack.remove(dataDir);
	app.relaunch({ args: [process.argv[1]] });
	app.quit();
};

const resetUserDataCommandLineFlag = '--reset-app-data';

export const setupUserData = () => {
	setupUserDataPath();

	if (process.argv.slice(2).includes(resetUserDataCommandLineFlag)) {
		resetUserData();
		return;
	}

	ipcMain.on('reset-app-data', () => {
		app.relaunch({ args: [process.argv[1], resetUserDataCommandLineFlag] });
		app.quit();
	});
};
