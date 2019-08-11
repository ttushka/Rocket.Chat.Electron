import { remote, ipcRenderer } from 'electron';
import jetpack from 'fs-jetpack';
import i18n from '../i18n';
import update from './dialogs/update';


const { autoUpdater } = remote.require('electron-updater');

const appDir = jetpack.cwd(remote.app.getAppPath(), remote.app.getAppPath().endsWith('app.asar') ? '..' : '.');
const userDataDir = jetpack.cwd(remote.app.getPath('userData'));
const updateSettingsFileName = 'update.json';

const loadUpdateSettings = (dir) => {
	try {
		return dir.read(updateSettingsFileName, 'json') || {};
	} catch (error) {
		console.error(error);
		return {};
	}
};

const appUpdateSettings = loadUpdateSettings(appDir);
const userUpdateSettings = loadUpdateSettings(userDataDir);
const updateSettings = (() => {
	const defaultUpdateSettings = { autoUpdate: true, canUpdate: true };

	if (appUpdateSettings.forced) {
		return Object.assign({}, defaultUpdateSettings, appUpdateSettings);
	} else {
		return Object.assign({}, defaultUpdateSettings, appUpdateSettings, userUpdateSettings);
	}
})();
delete updateSettings.forced;

const saveUpdateSettings = () => {
	if (appUpdateSettings.forced) {
		return;
	}

	userDataDir.write(updateSettingsFileName, userUpdateSettings, { atomic: true });
};


export const canUpdate = () => updateSettings.canUpdate &&
(
	(process.platform === 'linux' && Boolean(process.env.APPIMAGE)) ||
	(process.platform === 'win32' && !process.windowsStore) ||
	(process.platform === 'darwin' && !process.mas)
);

export const canAutoUpdate = () => updateSettings.autoUpdate !== false;

export const canSetAutoUpdate = () => !appUpdateSettings.forced || appUpdateSettings.autoUpdate !== false;

export const setAutoUpdate = (canAutoUpdate) => {
	if (!canSetAutoUpdate()) {
		return;
	}

	updateSettings.autoUpdate = userUpdateSettings.autoUpdate = Boolean(canAutoUpdate);
	saveUpdateSettings();
};

export const skipUpdateVersion = (version) => {
	userUpdateSettings.skip = version;
	saveUpdateSettings();
};

export const downloadUpdate = async () => {
	try {
		await autoUpdater.downloadUpdate();
	} catch (e) {
		autoUpdater.emit('error', e);
	}
};

let checkingForUpdates = false;

export const checkForUpdates = async ({ forced = false } = {}) => {
	if (checkingForUpdates) {
		return;
	}

	if ((forced || canAutoUpdate()) && canUpdate()) {
		checkingForUpdates = true;
		try {
			await autoUpdater.checkForUpdates();
		} catch (error) {
			autoUpdater.emit('error', error);
		}
	}
};

const handleCheckingForUpdate = () => {
};

const handleUpdateAvailable = async ({ version }) => {
	if (checkingForUpdates) {
		ipcRenderer.emit('update-result', null, true);
		checkingForUpdates = false;
	} else if (updateSettings.skip === version) {
		return;
	}

	update.open({ newVersion: version });
};

const handleUpdateNotAvailable = () => {
	if (checkingForUpdates) {
		ipcRenderer.emit('update-result', null, false);
		checkingForUpdates = false;
	}
};

const handleUpdateDownloaded = async () => {
	const response = remote.dialog.showMessageBox(remote.getCurrentWindow(), {
		type: 'question',
		title: i18n.__('dialog.updateReady.title'),
		message: i18n.__('dialog.updateReady.message'),
		buttons: [
			i18n.__('dialog.updateReady.installLater'),
			i18n.__('dialog.updateReady.installNow'),
		],
		defaultId: 1,
	});

	if (response === 0) {
		remote.dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'info',
			title: i18n.__('dialog.updateInstallLater.title'),
			message: i18n.__('dialog.updateInstallLater.message'),
			buttons: [i18n.__('dialog.updateInstallLater.ok')],
			defaultId: 0,
		});
		return;
	}

	remote.getCurrentWindow().removeAllListeners();
	remote.app.removeAllListeners('window-all-closed');
	try {
		autoUpdater.quitAndInstall();
	} catch (error) {
		autoUpdater.emit('error', error);
	}
};

const handleError = async (error) => {
	ipcRenderer.emit('update-error', null, error);

	if (checkingForUpdates) {
		ipcRenderer.emit('update-result', null, false);
		checkingForUpdates = false;
	}
};

export const setupUpdates = () => {
	autoUpdater.addListener('checking-for-update', handleCheckingForUpdate);
	autoUpdater.addListener('update-available', handleUpdateAvailable);
	autoUpdater.addListener('update-not-available', handleUpdateNotAvailable);
	autoUpdater.addListener('update-downloaded', handleUpdateDownloaded);
	autoUpdater.addListener('error', handleError);

	window.addEventListener('beforeunload', () => {
		autoUpdater.removeListener('checking-for-update', handleCheckingForUpdate);
		autoUpdater.removeListener('update-available', handleUpdateAvailable);
		autoUpdater.removeListener('update-not-available', handleUpdateNotAvailable);
		autoUpdater.removeListener('update-downloaded', handleUpdateDownloaded);
		autoUpdater.removeListener('error', handleError);
	}, false);
};
