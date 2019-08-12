import { remote, clipboard } from 'electron';
import { t } from 'i18next';
import { reportError, reportWarning } from '../errorHandling';
import ipc from '../ipc';
import aboutModal from './aboutModal';
import { clearCertificates, setCertificateTrustRequestHandler } from './certificates';
import contextMenu from './contextMenu';
import { showErrorBox, showOpenDialog, showMessageBox } from './dialogs';
import dock from './dock';
import landingView from './landingView';
import menus from './menus';
import screenSharingModal from './screenSharingModal';
import servers, { getServers, getActiveServerURL } from './servers';
import sideBar from './sideBar';
import {
	installSpellCheckingDictionaries,
	getSpellCheckingDictionariesPath,
	setSpellCheckingDictionaryEnabled,
} from './spellChecking';
import setTouchBar from './touchBar';
import trayIcon from './trayIcon';
import updateModal from './updateModal';
import {
	skipUpdateVersion,
	downloadUpdate,
	canUpdate,
	canAutoUpdate,
	canSetAutoUpdate,
	setAutoUpdate,
	checkForUpdates,
	quitAndInstallUpdate,
} from './updates';
import { requestAppDataReset } from './userData';
import webview from './webview';
import mainWindow from './mainWindow';


const { app, getCurrentWindow, shell } = remote;

const updatePreferences = () => {
	const showWindowOnUnreadChanged = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
	const hasTrayIcon = localStorage.getItem('hideTray') ?
		localStorage.getItem('hideTray') !== 'true' : (process.platform !== 'linux');
	const isMenuBarVisible = localStorage.getItem('autohideMenu') !== 'true';
	const isSideBarVisible = localStorage.getItem('sidebar-closed') !== 'true';

	mainWindow.setProps({
		hasTrayIcon,
	});

	menus.setProps({
		hasTrayIcon,
		isFullScreen: mainWindow.isFullScreen(),
		isMenuBarVisible,
		isSideBarVisible,
		showWindowOnUnreadChanged,
	});

	trayIcon.setProps({
		visible: hasTrayIcon,
	});

	dock.setProps({
		hasTrayIcon,
	});

	sideBar.setProps({
		visible: isSideBarVisible,
	});

	webview.setSidebarPaddingEnabled(!isSideBarVisible);
};


const updateServers = () => {
	menus.setProps({
		servers: getServers(),
		activeServerURL: getActiveServerURL(),
	});

	sideBar.setProps({
		servers: getServers(),
		activeServerURL: getActiveServerURL(),
	});
};


const updateWindowState = () => trayIcon.setProps({ isMainWindowVisible: getCurrentWindow().isVisible() });

const destroyAll = () => {
	try {
		const mainWindow = getCurrentWindow();
		mainWindow.removeListener('hide', updateWindowState);
		mainWindow.removeListener('show', updateWindowState);
		mainWindow.removeAllListeners();
	} catch (error) {
		remote.getGlobal('console').error(error);
	}
};

export default () => {
	window.addEventListener('beforeunload', destroyAll);
	window.addEventListener('focus', () => {
		webview.focusActive();
	});

	getCurrentWindow().on('hide', updateWindowState);
	getCurrentWindow().on('show', updateWindowState);

	aboutModal.setProps({
		canUpdate: canUpdate(),
		canAutoUpdate: canAutoUpdate(),
		canSetAutoUpdate: canSetAutoUpdate(),
		currentVersion: app.getVersion(),
		onDismiss: () => {
			aboutModal.setProps({ visible: false });
		},
		onClickCheckForUpdates: () => {
			checkForUpdates();
		},
		onToggleCheckForUpdatesOnStart: (isEnabled) => {
			setAutoUpdate(isEnabled);
		},
	});

	contextMenu.setProps({
		onClickReplaceMispelling: (webContents, correction) => {
			webContents.replaceMisspelling(correction);
		},
		onToggleSpellCheckingDictionary: (webContents, name, isEnabled) => {
			setSpellCheckingDictionaryEnabled(name, isEnabled);
		},
		onClickBrowseForSpellCheckLanguage: async () => {
			const { filePaths } = await showOpenDialog({
				title: t('dialog.loadDictionary.title'),
				defaultPath: getSpellCheckingDictionariesPath(),
				filters: [
					{ name: t('dialog.loadDictionary.dictionaries'), extensions: ['aff', 'dic'] },
					{ name: t('dialog.loadDictionary.allFiles'), extensions: ['*'] },
				],
				properties: ['openFile', 'multiSelections'],
			});

			try {
				await installSpellCheckingDictionaries(filePaths);
			} catch (error) {
				reportError(error);
				showErrorBox(
					t('dialog.loadDictionaryError.title'),
					t('dialog.loadDictionaryError.message', { message: error.message })
				);
			}
		},
		onClickSaveImageAs: (webContents, url) => {
			webContents.downloadURL(url);
		},
		onClickOpenLink: (webContents, url) => {
			shell.openExternal(url);
		},
		onClickCopyLinkText: (webContents, url, text) => {
			clipboard.write({ text, bookmark: text });
		},
		onClickCopyLinkAddress: (webContents, url, text) => {
			clipboard.write({ text: url, bookmark: text });
		},
		onClickUndo: (webContents) => {
			webContents.undo();
		},
		onClickRedo: (webContents) => {
			webContents.redo();
		},
		onClickCut: (webContents) => {
			webContents.cut();
		},
		onClickCopy: (webContents) => {
			webContents.copy();
		},
		onClickPaste: (webContents) => {
			webContents.paste();
		},
		onClickSelectAll: (webContents) => {
			webContents.selectAll();
		},
	});

	ipc.connect('updates/checking', () => {
		aboutModal.setProps({ isCheckingForUpdate: true });
		updateModal.setProps({ isCheckingForUpdate: true });
	});

	ipc.connect('updates/update-available', (newVersion) => {
		const props = {
			visible: false,
			newVersion,
			isCheckingForUpdate: false,
		};
		aboutModal.setProps(props);
		updateModal.setProps(props);
	});

	ipc.connect('updates/update-not-available', () => {
		const props = {
			newVersion: undefined,
			isCheckingForUpdate: false,
			updateMessage: t('dialog.about.noUpdatesAvailable'),
		};
		aboutModal.setProps(props);
		updateModal.setProps(props);
	});

	ipc.connect('updates/error', (error) => {
		const props = {
			newVersion: undefined,
			isCheckingForUpdate: false,
			updateMessage: t('dialog.about.errorWhileLookingForUpdates'),
		};
		aboutModal.setProps(props);
		updateModal.setProps(props);
		reportWarning(error);
	});

	ipc.connect('updates/update-downloaded', async () => {
		const { response } = await showMessageBox({
			type: 'question',
			title: t('dialog.updateReady.title'),
			message: t('dialog.updateReady.message'),
			buttons: [
				t('dialog.updateReady.installLater'),
				t('dialog.updateReady.installNow'),
			],
			defaultId: 1,
		});

		if (response === 0) {
			await showMessageBox({
				type: 'info',
				title: t('dialog.updateInstallLater.title'),
				message: t('dialog.updateInstallLater.message'),
				buttons: [t('dialog.updateInstallLater.ok')],
				defaultId: 0,
			});
			return;
		}

		getCurrentWindow().removeAllListeners();
		app.removeAllListeners('window-all-closed');
		quitAndInstallUpdate();
	});

	landingView.setProps({});

	menus.setProps({
		appName: app.getName(),
		webContents: remote.getCurrentWebContents(),
		onClickShowAbout: () => {
			aboutModal.setProps({ visible: true });
		},
		onClickQuit: () => {
			app.quit();
		},
		onClickAddNewServer: () => {
			getCurrentWindow().show();
			servers.clearActive();
			webview.showLanding();
		},
		onClickUndo: (webContents) => {
			webContents.undo();
		},
		onClickRedo: (webContents) => {
			webContents.redo();
		},
		onClickCut: (webContents) => {
			webContents.cut();
		},
		onClickCopy: (webContents) => {
			webContents.copy();
		},
		onClickPaste: (webContents) => {
			webContents.paste();
		},
		onClickSelectAll: (webContents) => {
			webContents.selectAll();
		},
		onClickReload: (webContents) => {
			if (webContents === remote.getCurrentWebContents()) {
				return;
			}
			webContents.reload();
		},
		onClickReloadIgnoringCache: (webContents) => {
			if (webContents === remote.getCurrentWebContents()) {
				return;
			}
			webContents.reloadIgnoringCache();
		},
		onClickClearCertificates: () => {
			clearCertificates();
		},
		onClickOpenDevToolsForServer: (webContents) => {
			if (webContents === remote.getCurrentWebContents()) {
				return;
			}
			webContents.openDevTools();
		},
		onClickGoBack: (webContents) => {
			webContents.goBack();
		},
		onClickGoForward: (webContents) => {
			webContents.goForward();
		},
		onToggleTrayIcon: (isEnabled) => {
			localStorage.setItem('hideTray', JSON.stringify(!isEnabled));
			updatePreferences();
		},
		onToggleFullScreen: (isEnabled) => {
			getCurrentWindow().setFullScreen(isEnabled);
			updatePreferences();
		},
		onToggleMenuBar: (isEnabled) => {
			localStorage.setItem('autohideMenu', JSON.stringify(!isEnabled));
			updatePreferences();
		},
		onToggleSideBar: (isEnabled) => {
			localStorage.setItem('sidebar-closed', JSON.stringify(!isEnabled));
			updatePreferences();
		},
		onClickResetZoom: () => {
			remote.getCurrentWebContents().setZoomLevel(0);
		},
		onClickZoomIn: () => {
			const newZoomLevel = Math.min(remote.getCurrentWebContents().getZoomLevel() + 1, 9);
			remote.getCurrentWebContents().setZoomLevel(newZoomLevel);
		},
		onClickZoomOut: () => {
			const newZoomLevel = Math.max(remote.getCurrentWebContents().getZoomLevel() - 1, -9);
			remote.getCurrentWebContents().setZoomLevel(newZoomLevel);
		},
		onClickSelectServer: ({ url }) => {
			getCurrentWindow().show();
			servers.setActive(url);
		},
		onClickReloadApp: () => {
			remote.getCurrentWebContents().reloadIgnoringCache();
		},
		onToggleAppDevTools: () => {
			remote.getCurrentWebContents().toggleDevTools();
		},
		onToggleShowWindowOnUnreadChanged: (isEnabled) => {
			localStorage.setItem('showWindowOnUnreadChanged', JSON.stringify(isEnabled));
			updatePreferences();
		},
		onClickOpenURL: (url) => {
			shell.openExternal(url);
		},
		onClickResetAppData: async () => {
			const { response } = await showMessageBox({
				type: 'question',
				buttons: [
					t('dialog.resetAppData.yes'),
					t('dialog.resetAppData.cancel'),
				],
				defaultId: 1,
				title: t('dialog.resetAppData.title'),
				message: t('dialog.resetAppData.message'),
			});

			const mustResetAppData = response === 0;

			if (!mustResetAppData) {
				return;
			}

			requestAppDataReset();
		},
	});

	screenSharingModal.setProps({
		onDismiss: () => {
			screenSharingModal.setProps({
				visible: false,
			});

			ipc.emit('screenshare-result', 'PermissionDeniedError');
		},
		onSelectScreenSharingSource: (id) => {
			screenSharingModal.setProps({
				visible: false,
			});

			ipc.emit('screenshare-result', id);
		},
	});

	servers.on('loaded', () => {
		webview.loaded();
		updateServers();
	});

	servers.on('host-added', (hostUrl) => {
		webview.add(servers.get(hostUrl));
		updateServers();
	});

	servers.on('host-removed', (hostUrl) => {
		webview.remove(hostUrl);
		servers.clearActive();
		webview.showLanding();
		updateServers();
	});

	servers.on('active-setted', (hostUrl) => {
		webview.setActive(hostUrl);
		updateServers();
	});

	servers.on('active-cleared', (hostUrl) => {
		webview.deactiveAll(hostUrl);
		updateServers();
	});

	servers.on('title-setted', () => {
		updateServers();
	});

	sideBar.setProps({
		onClickAddServer: () => {
			servers.clearActive();
			webview.showLanding();
		},
		onClickServer: (serverURL) => {
			servers.setActive(serverURL);
		},
		onClickReloadServer: (serverURL) => {
			webview.getByUrl(serverURL).reload();
		},
		onClickRemoveServer: (serverURL) => {
			servers.removeHost(serverURL);
		},
		onClickOpenDevToolsForServer: (serverURL) => {
			webview.getByUrl(serverURL).openDevTools();
		},
		onSortServers: (sorting) => {
			localStorage.setItem('rocket.chat.sortOrder', JSON.stringify(sorting));
			updateServers();
		},
	});

	trayIcon.setProps({
		appName: app.getName(),
		onToggleMainWindow: (isVisible) => {
			if (isVisible) {
				getCurrentWindow().show();
				return;
			}

			getCurrentWindow().hide();
		},
		onClickQuit: () => {
			app.quit();
		},
	});

	updateModal.setProps({
		currentVersion: app.getVersion(),
		onDismiss: () => {
			updateModal.setProps({ visible: false });
		},
		onSkipUpdateVersion: async (version) => {
			await showMessageBox({
				type: 'warning',
				title: t('dialog.updateSkip.title'),
				message: t('dialog.updateSkip.message'),
				buttons: [t('dialog.updateSkip.ok')],
				defaultId: 0,
			});
			skipUpdateVersion(version);
			updateModal.setProps({ visible: false });
		},
		onRemindUpdateLater: () => {
			updateModal.setProps({ visible: false });
		},
		onInstallUpdate: async () => {
			await showMessageBox({
				type: 'info',
				title: t('dialog.updateDownloading.title'),
				message: t('dialog.updateDownloading.message'),
				buttons: [t('dialog.updateDownloading.ok')],
				defaultId: 0,
			});
			downloadUpdate();
			updateModal.setProps({ visible: false });
		},
	});

	let badges = {};

	webview.on('ipc-message-unread-changed', (serverURL, [badge]) => {
		if (typeof badge === 'number' && localStorage.getItem('showWindowOnUnreadChanged') === 'true') {
			const mainWindow = remote.getCurrentWindow();
			if (!mainWindow.isFocused()) {
				mainWindow.once('focus', () => mainWindow.flashFrame(false));
				mainWindow.showInactive();
				mainWindow.flashFrame(true);
			}
		}

		badges = {
			...badges,
			[serverURL]: badge || null,
		};

		sideBar.setProps({ badges });

		const mentionCount = Object.values(badges)
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0);
		const globalBadge = mentionCount
			|| (Object.values(badges).some((badge) => !!badge) && '•')
			|| null;

		trayIcon.setProps({ badge: globalBadge });
		dock.setProps({ badge: globalBadge });
	});

	webview.on('ipc-message-title-changed', (hostUrl, [title]) => {
		servers.setHostTitle(hostUrl, title);
	});

	webview.on('ipc-message-focus', (hostUrl) => {
		servers.setActive(hostUrl);
	});

	let styles = {};

	webview.on('ipc-message-sidebar-style', (hostUrl, [style]) => {
		styles = {
			...styles,
			[hostUrl]: style || null,
		};
		sideBar.setProps({ styles });
	});

	webview.on('dom-ready', () => {
		const hasSidebar = localStorage.getItem('sidebar-closed') !== 'true';
		sideBar.setProps({
			visible: hasSidebar,
		});
		webview.setSidebarPaddingEnabled(!hasSidebar);
	});

	if (process.platform === 'darwin') {
		setTouchBar();
	}

	servers.restoreActive();
	updatePreferences();
	updateServers();
	updateWindowState();

	setCertificateTrustRequestHandler(async (webContents, certificateUrl, error, certificate, isReplacing) => {
		const { issuerName } = certificate || {};

		const title = t('dialog.certificateError.title');
		const message = t('dialog.certificateError.message', {
			issuerName,
		});
		let detail = `URL: ${ certificateUrl }\nError: ${ error }`;
		if (isReplacing) {
			detail = t('error.differentCertificate', { detail });
		}

		const { response } = await showMessageBox({
			title,
			message,
			detail,
			type: 'warning',
			buttons: [
				t('dialog.certificateError.yes'),
				t('dialog.certificateError.no'),
			],
			cancelId: 1,
		});

		return response === 0;
	});
};
