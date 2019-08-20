import { remote } from 'electron';
import { reportError } from '../errorHandling';
import { readAppDataFile, readUserDataFile, writeUserDataFile } from './userData';


const { autoUpdater } = remote.require('electron-updater');

const updateSettingsFileName = 'update.json';
let appUpdateSettings = {};
let userUpdateSettings = {};
let updateSettings = {};

const loadUpdateSettings = async () => {
	try {
		appUpdateSettings = await readAppDataFile(updateSettingsFileName, 'json') || {};
	} catch (error) {
		reportError(error);
		appUpdateSettings = {};
	}

	try {
		userUpdateSettings = await readUserDataFile(updateSettingsFileName, 'json') || {};
	} catch (error) {
		reportError(error);
		userUpdateSettings = {};
	}

	updateSettings = (() => {
		const defaultUpdateSettings = { autoUpdate: true, canUpdate: true };

		if (appUpdateSettings.forced) {
			return Object.assign({}, defaultUpdateSettings, appUpdateSettings);
		} else {
			return Object.assign({}, defaultUpdateSettings, appUpdateSettings, userUpdateSettings);
		}
	})();
	delete updateSettings.forced;
};

const persistUpdateSettings = async () => {
	if (appUpdateSettings.forced) {
		return;
	}

	await writeUserDataFile(updateSettingsFileName, userUpdateSettings);
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
	persistUpdateSettings();
};

export const skipUpdateVersion = (version) => {
	userUpdateSettings.skip = version;
	persistUpdateSettings();
};

export const downloadUpdate = async () => {
	try {
		await autoUpdater.downloadUpdate();
	} catch (error) {
		autoUpdater.emit('error', error);
	}
};

let isCheckingForUpdates = false;

export const checkForUpdates = async () => {
	if (isCheckingForUpdates) {
		return;
	}

	if (!canUpdate()) {
		return;
	}

	try {
		await autoUpdater.checkForUpdates();
	} catch (error) {
		autoUpdater.emit('error', error);
	}
};

export const quitAndInstallUpdate = () => {
	try {
		autoUpdater.quitAndInstall();
	} catch (error) {
		autoUpdater.emit('error', error);
	}
};

let props = {
	onCheckingForUpdates: null,
	onUpdateNotAvailable: null,
	onUpdateAvailable: null,
	onUpdateDownloaded: null,
	onError: null,
};

const handleCheckingForUpdate = () => {
	isCheckingForUpdates = true;
	const { onCheckingForUpdates } = props;
	onCheckingForUpdates && onCheckingForUpdates();
};

const handleUpdateAvailable = async ({ version }) => {
	if (updateSettings.skip === version) {
		const { onUpdateNotAvailable } = props;
		onUpdateNotAvailable && onUpdateNotAvailable();
		return;
	}

	if (!isCheckingForUpdates) {
		return;
	}

	const { onUpdateAvailable } = props;
	onUpdateAvailable && onUpdateAvailable(version);
	isCheckingForUpdates = false;
};

const handleUpdateNotAvailable = () => {
	if (!isCheckingForUpdates) {
		return;
	}

	const { onUpdateNotAvailable } = props;
	onUpdateNotAvailable && onUpdateNotAvailable();
	isCheckingForUpdates = false;
};

const handleUpdateDownloaded = () => {
	const { onUpdateDownloaded } = props;
	onUpdateDownloaded && onUpdateDownloaded();
};

const handleError = (error) => {
	const { onError } = props;
	onError && onError(error);
	isCheckingForUpdates = false;
};

const setupUpdates = () => {
	loadUpdateSettings();

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

	if (canAutoUpdate()) {
		checkForUpdates();
	}
};

let mounted = false;
const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	if (mounted) {
		return;
	}

	setupUpdates();
	mounted = true;
};

export default {
	setProps,
};
