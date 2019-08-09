import { app, BrowserWindow, Menu } from 'electron';
import i18n from '../i18n';


const getPathFromApp = (path) => `${ app.getAppPath() }/app/${ path }`;

let mainWindow = null;

export const unsetDefaultApplicationMenu = () => {
	if (process.platform !== 'darwin') {
		Menu.setApplicationMenu(null);
		return;
	}

	const emptyMenuTemplate = [{
		label: app.getName(),
		submenu: [
			{
				label: i18n.__('menus.quit', { appName: app.getName() }),
				accelerator: 'CommandOrControl+Q',
				click: () => app.quit(),
			},
		],
	}];
	Menu.setApplicationMenu(Menu.buildFromTemplate(emptyMenuTemplate));
};

export const createMainWindow = () => {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 600,
		minWidth: 600,
		minHeight: 400,
		titleBarStyle: 'hidden',
		show: false,
		webPreferences: {
			nodeIntegration: true,
		},
	});
	mainWindow.loadFile(getPathFromApp('public/app.html'));
};

export const getMainWindow = async () => {
	await app.whenReady();

	if (!mainWindow) {
		await createMainWindow();
	}

	return mainWindow;
};

