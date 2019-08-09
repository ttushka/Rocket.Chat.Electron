import { app, ipcMain } from 'electron';
import { setupErrorHandling } from './errorHandling';
import { setupUserData } from './main/userData';
import './main/updates';
import { getMainWindow, unsetDefaultApplicationMenu, createMainWindow } from './main/mainWindow';
import i18n from './i18n';


const prepareApp = () => {
	setupErrorHandling('main');

	app.setAsDefaultProtocolClient('rocketchat');
	app.setAppUserModelId('chat.rocket');

	setupUserData();

	const canStart = process.mas || app.requestSingleInstanceLock();

	if (!canStart) {
		app.quit();
		return;
	}

	app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

	// TODO: make it a setting
	if (process.platform === 'linux') {
		app.disableHardwareAcceleration();
	}

	app.on('window-all-closed', () => {
		app.quit();
	});

	app.on('activate', async () => {
		(await getMainWindow()).show();
	});

	app.on('login', (event) => {
		event.preventDefault();
	});

	app.on('certificate-error', (event) => {
		event.preventDefault();
	});

	app.on('open-url', (event) => {
		event.preventDefault();
	});
};

(async () => {
	prepareApp();
	await app.whenReady();
	await i18n.initialize();
	unsetDefaultApplicationMenu();
	createMainWindow();
	ipcMain.emit('check-for-updates');
})();
