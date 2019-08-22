import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { remote } from 'electron';
import { EventEmitter } from 'events';
import { reportError, reportWarning } from '../../errorHandling';
import { useEventEmitter } from '../hooks/useEventEmitter';
import { useEventListener } from '../hooks/useEventListener';
import { readAppDataFile, readUserDataFile, writeUserDataFile } from '../userData';


const { autoUpdater } = remote.require('electron-updater');

const updateSettingsFileName = 'update.json';

const readSettingsFile = async (readFile) => {
	let updateSettings;

	try {
		updateSettings = await readFile(updateSettingsFileName, 'json');
	} catch (error) {
		reportError(error);
	}

	if (updateSettings === null || typeof updateSettings !== 'object') {
		updateSettings = {};
	}

	return updateSettings;
};

const loadUpdateSettings = async () => {
	const [appUpdateSettings, userUpdateSettings] =
		await Promise.all([readAppDataFile, readUserDataFile].map(readSettingsFile));

	const updateSettings = Object.assign(
		{ autoUpdate: true, canUpdate: true },
		appUpdateSettings,
		appUpdateSettings.forced ? undefined : userUpdateSettings
	);

	const canUpdate = updateSettings.canUpdate &&
	(
		(process.platform === 'linux' && Boolean(process.env.APPIMAGE)) ||
		(process.platform === 'win32' && !process.windowsStore) ||
		(process.platform === 'darwin' && !process.mas)
	);

	const canSetCheckForUpdatesOnStart = !appUpdateSettings.forced || appUpdateSettings.autoUpdate !== false;

	const canPersistSettings = !appUpdateSettings.forced;

	const initialDoesCheckForUpdatesOnStart = updateSettings.autoUpdate !== false;

	const initialSkippedVersion = updateSettings.skip;

	return {
		canUpdate,
		canSetCheckForUpdatesOnStart,
		canPersistSettings,
		initialDoesCheckForUpdatesOnStart,
		initialSkippedVersion,
	};
};

const persistUpdateSettings = async ({
	doesCheckForUpdatesOnStart,
	skippedVersion,
}) => {
	await writeUserDataFile(updateSettingsFileName, {
		autoUpdate: doesCheckForUpdatesOnStart,
		skip: skippedVersion,
	});
};

const checkForUpdates = async () => {
	try {
		await autoUpdater.checkForUpdates();
	} catch (error) {
		autoUpdater.emit('error', error);
	}
};

const downloadUpdate = async () => {
	try {
		await autoUpdater.downloadUpdate();
	} catch (error) {
		autoUpdater.emit('error', error);
	}
};

const quitAndInstallUpdate = async () => {
	try {
		await autoUpdater.quitAndInstall();
	} catch (error) {
		autoUpdater.emit('error', error);
	}
};

const AutoUpdaterEventEmitterContext = createContext(new EventEmitter());
const AutoUpdaterStateMutatorContext = createContext((state) => state);
const AutoUpdaterStateContext = createContext({});

export const useAutoUpdaterEvent = (eventName, listener) => {
	const eventEmitter = useContext(AutoUpdaterEventEmitterContext);
	useEventListener(eventEmitter, eventName, listener);
};

export const useAutoUpdaterActions = () => {
	const updateState = useContext(AutoUpdaterStateMutatorContext);

	return {
		checkForUpdates,
		downloadUpdate,
		quitAndInstallUpdate,
		setSkippedVersion: (skippedVersion) => updateState({ skippedVersion }),
		setCheckForUpdatesOnStart: (doesCheckForUpdatesOnStart) => updateState({ doesCheckForUpdatesOnStart }),
	};
};

export const useAutoUpdaterState = () => useContext(AutoUpdaterStateContext);

const useAutoUpdaterEvents = (state, updateState) => {
	const eventEmitter = useEventEmitter();

	const { skippedVersion } = state;

	const handleCheckingForUpdate = () => {
		updateState({ isCheckingForUpdates: true });
		eventEmitter.emit('checking-for-updates');
	};

	const handleUpdateAvailable = async ({ version }) => {
		updateState({ isCheckingForUpdates: false });

		if (version === skippedVersion) {
			updateState({ newVersion: null });
			eventEmitter.emit('update-not-available');
			return;
		}

		updateState({ newVersion: version });
		eventEmitter.emit('update-available', version);
	};

	const handleUpdateNotAvailable = () => {
		updateState({
			isCheckingForUpdates: false,
			newVersion: null,
		});
		eventEmitter.emit('update-not-available');
	};

	const handleUpdateDownloaded = () => {
		eventEmitter.emit('update-downloaded');
	};

	const handleError = (error) => {
		updateState({
			isCheckingForUpdates: false,
		});
		reportWarning(error);
		eventEmitter.emit('error', error);
	};

	useEventListener(autoUpdater, 'checking-for-update', handleCheckingForUpdate);
	useEventListener(autoUpdater, 'update-available', handleUpdateAvailable);
	useEventListener(autoUpdater, 'update-not-available', handleUpdateNotAvailable);
	useEventListener(autoUpdater, 'update-downloaded', handleUpdateDownloaded);
	useEventListener(autoUpdater, 'error', handleError);

	return eventEmitter;
};

const useUpdateSettingsPersistence = ({
	doesCheckForUpdatesOnStart,
	skippedVersion,
}, canPersistSettings) => {
	useEffect(() => {
		if (!canPersistSettings) {
			return;
		}

		const updateSettings = {
			doesCheckForUpdatesOnStart,
			skippedVersion,
		};

		persistUpdateSettings(updateSettings);
	}, [canPersistSettings, doesCheckForUpdatesOnStart, skippedVersion]);
};

export const AutoUpdaterHandler = React.lazy(async () => {
	const {
		canUpdate,
		canSetCheckForUpdatesOnStart,
		canPersistSettings,
		initialDoesCheckForUpdatesOnStart,
		initialSkippedVersion,
	} = await loadUpdateSettings();

	function AutoUpdater({ children }) {
		const [state, updateState] = useReducer((state, mutatedState) => ({ ...state, ...mutatedState }), {
			canUpdate,
			canSetCheckForUpdatesOnStart,
			canPersistSettings,
			newVersion: undefined,
			isCheckingForUpdates: false,
			doesCheckForUpdatesOnStart: initialDoesCheckForUpdatesOnStart,
			skippedVersion: initialSkippedVersion,
		});

		const eventEmitter = useAutoUpdaterEvents(state, updateState);
		useUpdateSettingsPersistence(state, canPersistSettings);

		useEffect(() => {
			if (!canUpdate || !initialDoesCheckForUpdatesOnStart) {
				return;
			}

			checkForUpdates();
		}, []);

		return <AutoUpdaterEventEmitterContext.Provider value={eventEmitter}>
			<AutoUpdaterStateMutatorContext.Provider value={updateState}>
				<AutoUpdaterStateContext.Provider value={state}>
					{children}
				</AutoUpdaterStateContext.Provider>
			</AutoUpdaterStateMutatorContext.Provider>
		</AutoUpdaterEventEmitterContext.Provider>;
	}

	return { default: AutoUpdater };
});
