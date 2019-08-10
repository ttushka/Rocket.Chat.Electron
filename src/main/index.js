import { app } from 'electron';
import { setupErrorHandling } from '../errorHandling';
import { setupUserData } from './userData';
import { setupMainWindow } from './mainWindow';


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
	app.commandLine.appendSwitch('disable-site-isolation-trials');

	app.on('window-all-closed', () => {
		app.quit();
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

if (require.main === module) {
	prepareApp();
	app.whenReady().then(() => {
		setupMainWindow();
	});
}
