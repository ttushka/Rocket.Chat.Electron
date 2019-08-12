import { remote, clipboard } from 'electron';
import { t } from 'i18next';
import servers, { getServers } from './servers';
import sidebar from './sidebar';
import webview from './webview';
import setTouchBar from './touchBar';
import dock from './dock';
import menus from './menus';
import tray from './tray';
import aboutModal from './aboutModal';
import { reportError, reportWarning } from '../errorHandling';
import { showErrorBox, showOpenDialog, showMessageBox } from './dialogs';
import {
	installSpellCheckingDictionaries,
	getSpellCheckingDictionariesPath,
	setSpellCheckingDictionaryEnabled,
} from './spellChecking';
import contextMenu from './contextMenu';
import { clearCertificates, setCertificateTrustRequestHandler } from './certificates';
import updateModal from './updateModal';
import { skipUpdateVersion, downloadUpdate, canUpdate, canAutoUpdate, canSetAutoUpdate, setAutoUpdate, checkForUpdates, quitAndInstallUpdate } from './updates';
import ipc from '../ipc';
import screenSharingModal from './screenSharingModal';


const { app, getCurrentWindow, shell } = remote;

const updatePreferences = () => {
	const mainWindow = getCurrentWindow();
	const showWindowOnUnreadChanged = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
	const hasTrayIcon = localStorage.getItem('hideTray') ?
		localStorage.getItem('hideTray') !== 'true' : (process.platform !== 'linux');
	const hasMenuBar = localStorage.getItem('autohideMenu') !== 'true';
	const hasSidebar = localStorage.getItem('sidebar-closed') !== 'true';

	menus.setProps({
		showTrayIcon: hasTrayIcon,
		showFullScreen: mainWindow.isFullScreen(),
		showWindowOnUnreadChanged,
		showMenuBar: hasMenuBar,
		showServerList: hasSidebar,
	});

	tray.setState({
		showIcon: hasTrayIcon,
	});

	dock.setState({
		hasTrayIcon,
	});

	sidebar.setState({
		visible: hasSidebar,
	});

	webview.setSidebarPaddingEnabled(!hasSidebar);
};


const updateServers = () => {
	const sorting = JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];

	menus.setProps({
		servers: getServers(),
		currentServerUrl: servers.active,
	});

	sidebar.setState({
		hosts: servers.hosts,
		sorting,
		active: servers.active,
	});
};


const updateWindowState = () => tray.setState({ isMainWindowVisible: getCurrentWindow().isVisible() });

const destroyAll = () => {
	try {
		menus.removeAllListeners();
		tray.destroy();
		dock.destroy();
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
		onClickToggleSpellCheckingDictionary: (webContents, name, isEnabled) => {
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
		onClickToggleShowTrayIcon: (isEnabled) => {
			localStorage.setItem('hideTray', JSON.stringify(!isEnabled));
			updatePreferences();
		},
		onClickToggleFullScreen: (isEnabled) => {
			getCurrentWindow().setFullScreen(isEnabled);
			updatePreferences();
		},
		onClickToggleMenuBar: (isEnabled) => {
			localStorage.setItem('autohideMenu', JSON.stringify(!isEnabled));
			updatePreferences();
		},
		onClickToggleSideBar: (isEnabled) => {
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
		onClickToggleAppDevTools: () => {
			remote.getCurrentWebContents().toggleDevTools();
		},
		onClickToggleShowWindowOnUnreadChanged: (isEnabled) => {
			localStorage.setItem('showWindowOnUnreadChanged', JSON.stringify(isEnabled));
			updatePreferences();
		},
		onClickOpenURL: (url) => {
			shell.openExternal(url);
		},
		onClickResetAppData: () => {
			servers.resetAppData();
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

	sidebar.on('select-server', (hostUrl) => {
		servers.setActive(hostUrl);
	});

	sidebar.on('reload-server', (hostUrl) => {
		webview.getByUrl(hostUrl).reload();
	});

	sidebar.on('remove-server', (hostUrl) => {
		servers.removeHost(hostUrl);
	});

	sidebar.on('open-devtools-for-server', (hostUrl) => {
		webview.getByUrl(hostUrl).openDevTools();
	});

	sidebar.on('add-server', () => {
		servers.clearActive();
		webview.showLanding();
	});

	sidebar.on('servers-sorted', (sorting) => {
		localStorage.setItem('rocket.chat.sortOrder', JSON.stringify(sorting));
		updateServers();
	});

	getCurrentWindow().on('hide', updateWindowState);
	getCurrentWindow().on('show', updateWindowState);

	tray.on('created', () => getCurrentWindow().emit('set-state', { hideOnClose: true }));
	tray.on('destroyed', () => getCurrentWindow().emit('set-state', { hideOnClose: false }));
	tray.on('set-main-window-visibility', (visible) =>
		(visible ? getCurrentWindow().show() : getCurrentWindow().hide()));
	tray.on('quit', () => app.quit());

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

	webview.on('ipc-message-unread-changed', (hostUrl, [badge]) => {
		if (typeof badge === 'number' && localStorage.getItem('showWindowOnUnreadChanged') === 'true') {
			const mainWindow = remote.getCurrentWindow();
			if (!mainWindow.isFocused()) {
				mainWindow.once('focus', () => mainWindow.flashFrame(false));
				mainWindow.showInactive();
				mainWindow.flashFrame(true);
			}
		}

		sidebar.setState({
			badges: {
				...sidebar.state.badges,
				[hostUrl]: badge || null,
			},
		});

		const mentionCount = Object.values(sidebar.state.badges)
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0);
		const globalBadge = mentionCount ||
			(Object.values(sidebar.state.badges).some((badge) => !!badge) && '•') ||
			null;

		tray.setState({ badge: globalBadge });
		dock.setState({ badge: globalBadge });
	});

	webview.on('ipc-message-title-changed', (hostUrl, [title]) => {
		servers.setHostTitle(hostUrl, title);
	});

	webview.on('ipc-message-focus', (hostUrl) => {
		servers.setActive(hostUrl);
	});

	webview.on('ipc-message-sidebar-style', (hostUrl, [style]) => {
		sidebar.setState({
			styles: {
				...sidebar.state.styles,
				[hostUrl]: style || null,
			},
		});
	});

	webview.on('dom-ready', () => {
		const hasSidebar = localStorage.getItem('sidebar-closed') !== 'true';
		sidebar.setState({
			visible: hasSidebar,
		});
		webview.setSidebarPaddingEnabled(!hasSidebar);
	});

	if (process.platform === 'darwin') {
		setTouchBar();
	}

	servers.restoreActive();
	sidebar.mount();
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
