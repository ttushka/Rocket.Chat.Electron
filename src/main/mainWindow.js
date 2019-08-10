import { app, BrowserWindow, Menu } from 'electron';
import { parse as parseURL } from 'url';


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
			webviewTag: true,
		},
	});

	const handleNewWindow = (event, url, frameName, disposition, options) => {
		event.preventDefault();

		const {
			webPreferences: {
				preloadURL,
				...webPreferences
			} = {},
		} = options;

		const window = new BrowserWindow({
			...options,
			webPreferences: {
				...webPreferences,
				preload: preloadURL ? parseURL(preloadURL).path : undefined,
			},
			show: false,
		});

		window.setMenu(null);
		window.setMenuBarVisibility(false);

		window.once('ready-to-show', () => {
			window.show();
		});

		if (!options.webContents) {
			window.loadURL(url);
		}

		event.newGuest = window;
	};

	mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
		webContents.on('new-window', handleNewWindow);
	});

	mainWindow.loadFile(getPathFromApp('public/app.html'));
};
