import { app } from 'electron';
import { setupErrorHandling } from './errorHandling';
import { setupUserData } from './main/userData';
import './main/basicAuth';
import { processDeepLink } from './main/deepLinks';
import './main/updates';
import { getMainWindow, unsetDefaultApplicationMenu, createMainWindow } from './main/mainWindow';
import i18n from './i18n';
export { default as certificate } from './main/certificateStore';


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

	app.on('open-url', (event, url) => {
		event.preventDefault();
		processDeepLink(url);
	});

	app.on('second-instance', (event, argv) => {
		argv.slice(2).forEach(processDeepLink);
	});

	app.on('activate', async () => {
		(await getMainWindow()).show();
	});
};

(async () => {
	prepareApp();
	await app.whenReady();
	await i18n.initialize();
	unsetDefaultApplicationMenu();
	createMainWindow();
	app.emit('start');
	process.argv.slice(2).forEach(processDeepLink);
})();
