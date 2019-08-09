import { app, BrowserWindow, Menu } from 'electron';


const getPathFromApp = (path) => `${ app.getAppPath() }/app/${ path }`;

const unsetDefaultApplicationMenu = () => {
	if (process.platform !== 'darwin') {
		Menu.setApplicationMenu(null);
		return;
	}

	const emptyMenuTemplate = [{
		label: app.getName(),
		submenu: [],
	}];
	Menu.setApplicationMenu(Menu.buildFromTemplate(emptyMenuTemplate));
};

export const setupMainWindow = () => {
	unsetDefaultApplicationMenu();

	const mainWindow = new BrowserWindow({
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
