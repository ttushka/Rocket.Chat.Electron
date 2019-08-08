import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { WindowStateHandler } from './state';
import i18n from '../../i18n';


let mainWindow = null;

let state = {
	hideOnClose: false,
};

const setState = (partialState) => {
	state = {
		...state,
		...partialState,
	};
};

async function attachWindowStateHandling(mainWindow) {
	const windowStateHandler = new WindowStateHandler(mainWindow, 'main');
	await windowStateHandler.load();
	await new Promise((resolve) => mainWindow.once('ready-to-show', resolve));
	windowStateHandler.apply();

	const exitFullscreen = () => new Promise((resolve) => {
		if (mainWindow.isFullScreen()) {
			mainWindow.once('leave-full-screen', resolve);
			mainWindow.setFullScreen(false);
			return;
		}
		resolve();
	});

	const close = () => {
		mainWindow.blur();

		if (process.platform === 'darwin' || state.hideOnClose) {
			mainWindow.hide();
		} else if (process.platform === 'win32') {
			mainWindow.minimize();
		} else {
			app.quit();
		}
	};

	app.on('activate', () => mainWindow && mainWindow.show());
	app.on('before-quit', () => {
		mainWindow = null;
		windowStateHandler.save();
	});

	mainWindow.on('resize', () => windowStateHandler.fetchAndSave());
	mainWindow.on('move', () => windowStateHandler.fetchAndSave());
	mainWindow.on('show', () => windowStateHandler.fetchAndSave());
	mainWindow.on('close', async (event) => {
		if (!mainWindow) {
			return;
		}

		event.preventDefault();
		await exitFullscreen();
		close();
		windowStateHandler.fetchAndSave();
	});

	mainWindow.on('set-state', setState);
}

const unsetDefaultApplicationMenu = () => {
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
				click() {
					app.quit();
				},
			},
		],
	}];
	Menu.setApplicationMenu(Menu.buildFromTemplate(emptyMenuTemplate));
};

async function createMainWindow() {
	unsetDefaultApplicationMenu();

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
	attachWindowStateHandling(mainWindow);
	mainWindow.loadFile(`${ app.getAppPath() }/app/public/app.html`);

	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}
}

export async function getMainWindow() {
	await app.whenReady();

	if (!mainWindow) {
		await createMainWindow();
	}

	return mainWindow;
}

export async function focus() {
	const mainWindow = await getMainWindow();

	if (process.platform === 'win32') {
		if (mainWindow.isVisible()) {
			mainWindow.focus();
		} else if (mainWindow.isMinimized()) {
			mainWindow.restore();
		} else {
			mainWindow.show();
		}

		return;
	}

	if (mainWindow.isMinimized()) {
		mainWindow.restore();
		return;
	}

	mainWindow.show();
	mainWindow.focus();
}

ipcMain.on('focus', focus);
