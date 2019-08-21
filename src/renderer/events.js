import { remote, clipboard } from 'electron';
import { t } from 'i18next';
import React from 'react';
import ReactDOM from 'react-dom';
import { reportError, reportWarning } from '../errorHandling';
import aboutModal from './aboutModal';
import certificates from './certificates';
import { App } from './components/App';
import contextMenu from './contextMenu';
import { showErrorBox, showOpenDialog, showMessageBox } from './dialogs';
import menus from './menus';
import screenSharingModal from './screenSharingModal';
import servers, { getServers, getActiveServerURL, sortServers, validateServerURL, setActiveServerURL, setServerProperties, addServer, removeServer } from './servers';
import sideBar from './sideBar';
import {
	installSpellCheckingDictionaries,
	getSpellCheckingDictionariesPath,
	setSpellCheckingDictionaryEnabled,
	getSpellCheckingCorrections,
	getSpellCheckingDictionaries,
	getEnabledSpellCheckingDictionaries,
} from './spellChecking';
import touchBar from './touchBar';
import trayIcon from './trayIcon';
import updateModal from './updateModal';
import updates, {
	skipUpdateVersion,
	downloadUpdate,
	canUpdate,
	canAutoUpdate,
	canSetAutoUpdate,
	quitAndInstallUpdate,
} from './updates';
import { requestAppDataReset } from './userData';
import webview from './webview';
import mainWindow from './mainWindow';
import deepLinks from './deepLinks';
import preferences, { getPreferences, setPreferences } from './preferences';


const { app, getCurrentWebContents, getCurrentWindow, getGlobal, shell } = remote;

let sideBarStyles = {};
let badges = {};
let openModal = null;
let updateInfo = {};
let webContents = getCurrentWebContents();
let editingParams = {};
let spellCheckingCorrections = [];
let spellCheckingDictionaries = [];

const update = () => {
	const isMainWindowVisible = getCurrentWindow().isVisible();
	const isMainWindowFullScreen = getCurrentWindow().isFullScreen();
	const servers = getServers();
	const activeServerURL = getActiveServerURL();
	const preferences = getPreferences();

	ReactDOM.render(<App
		isMainWindowVisible={isMainWindowVisible}
		isMainWindowFullScreen={isMainWindowFullScreen}
		servers={servers}
		activeServerURL={activeServerURL}
		preferences={preferences}
		sideBarStyles={sideBarStyles}
		badges={badges}
		openModal={openModal}
		updateInfo={updateInfo}
		webContents={webContents}
		editingParams={editingParams}
		spellCheckingCorrections={spellCheckingCorrections}
		spellCheckingDictionaries={spellCheckingDictionaries}
		canUpdate={canUpdate()}
		canAutoUpdate={canAutoUpdate()}
		canSetAutoUpdate={canSetAutoUpdate()}
	/>, document.getElementById('root'));
};

const setSideBarStyle = (serverURL, style) => {
	sideBarStyles = {
		...sideBarStyles,
		[serverURL]: style || null,
	};
	update();
};

const setBadge = (serverURL, badge) => {
	badges = {
		...badges,
		[serverURL]: badge || null,
	};
	update();
};

const setOpenModal = (modal) => {
	openModal = modal;
	update();
};

const setUpdateInfo = (props) => {
	updateInfo = {
		...updateInfo,
		...props,
	};
	update();
};

const setWebContents = (newWebContents) => {
	webContents = newWebContents;
	update();
};

const setEditingParams = (newEditingParams) => {
	editingParams = newEditingParams;
	update();
};

const setSpellCheckingCorrections = (newSpellCheckingCorrections) => {
	spellCheckingCorrections = newSpellCheckingCorrections;
	update();
};

const setSpellCheckingDictionaries = (newSpellCheckingDictionaries) => {
	spellCheckingDictionaries = newSpellCheckingDictionaries;
	update();
};

export default () => {
	window.addEventListener('beforeunload', () => {
		try {
			getCurrentWindow().removeAllListeners();
			ReactDOM.unmountComponentAtNode(document.getElementById('root'));
		} catch (error) {
			getGlobal('console').error(error);
		}
	});

	window.addEventListener('focus', () => {
		webContents.focus();
	});

	aboutModal.setProps({
		onDismiss: () => {
			setOpenModal(null);
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

	deepLinks.setProps({
		onAddHost: async (serverURL) => {
			mainWindow.activate();
			const servers = getServers();
			if (servers.some(({ url }) => url === serverURL)) {
				setActiveServerURL(serverURL);
				return;
			}

			const { response } = await showMessageBox({
				type: 'question',
				buttons: [t('dialog.addServer.add'), t('dialog.addServer.cancel')],
				defaultId: 0,
				title: t('dialog.addServer.title'),
				message: t('dialog.addServer.message', { host: serverURL }),
			});

			if (response !== 0) {
				return;
			}

			try {
				await validateServerURL(serverURL);
				addServer(serverURL);
			} catch (error) {
				showErrorBox(t('dialog.addServerError.title'), t('dialog.addServerError.message', { host: serverURL }));
			}
		},
	});

	mainWindow.setProps({
		onStateChange: update,
	});

	menus.setProps({
		appName: app.getName(),
		onClickShowAbout: () => {
			setOpenModal('about');
		},
		onClickQuit: () => {
			app.quit();
		},
		onClickAddNewServer: () => {
			getCurrentWindow().show();
			setActiveServerURL(null);
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
			if (webContents === getCurrentWebContents()) {
				return;
			}
			webContents.reload();
		},
		onClickReloadIgnoringCache: (webContents) => {
			if (webContents === getCurrentWebContents()) {
				return;
			}
			webContents.reloadIgnoringCache();
		},
		onClickClearCertificates: () => {
			certificates.clear();
		},
		onClickOpenDevToolsForServer: (webContents) => {
			if (webContents === getCurrentWebContents()) {
				return;
			}
			webContents.openDevTools();
		},
		onClickGoBack: (webContents) => {
			if (webContents === getCurrentWebContents()) {
				return;
			}
			webContents.goBack();
		},
		onClickGoForward: (webContents) => {
			if (webContents === getCurrentWebContents()) {
				return;
			}
			webContents.goForward();
		},
		onToggleTrayIcon: (isEnabled) => {
			setPreferences({ hasTrayIcon: isEnabled });
		},
		onToggleFullScreen: (isEnabled) => {
			getCurrentWindow().setFullScreen(isEnabled);
		},
		onToggleMenuBar: (isEnabled) => {
			setPreferences({ isMenuBarVisible: isEnabled });
		},
		onToggleSideBar: (isEnabled) => {
			setPreferences({ isSideBarVisible: isEnabled });
		},
		onClickResetZoom: () => {
			getCurrentWebContents().setZoomLevel(0);
		},
		onClickZoomIn: () => {
			const newZoomLevel = Math.min(getCurrentWebContents().getZoomLevel() + 1, 9);
			getCurrentWebContents().setZoomLevel(newZoomLevel);
		},
		onClickZoomOut: () => {
			const newZoomLevel = Math.max(getCurrentWebContents().getZoomLevel() - 1, -9);
			getCurrentWebContents().setZoomLevel(newZoomLevel);
		},
		onClickSelectServer: ({ url }) => {
			getCurrentWindow().show();
			setActiveServerURL(url);
		},
		onClickReloadApp: () => {
			getCurrentWebContents().reloadIgnoringCache();
		},
		onToggleAppDevTools: () => {
			getCurrentWebContents().toggleDevTools();
		},
		onToggleShowWindowOnUnreadChanged: (isEnabled) => {
			setPreferences({ showWindowOnUnreadChanged: isEnabled });
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

	preferences.setProps({
		onUpdate: update,
	});

	screenSharingModal.setProps({
		onDismiss: () => {
			setOpenModal(null);
			webContents.send('screenshare-result', 'PermissionDeniedError');
		},
		onSelectScreenSharingSource: (id) => {
			setOpenModal(null);
			webContents.send('screenshare-result', id);
		},
	});

	servers.setProps({
		onUpdate: update,
	});

	sideBar.setProps({
		onClickAddServer: () => {
			setActiveServerURL(null);
		},
		onClickServer: (serverURL) => {
			setActiveServerURL(serverURL);
		},
		onClickReloadServer: (serverURL) => {
			webview.reload(serverURL);
		},
		onClickRemoveServer: (serverURL) => {
			removeServer(serverURL);
		},
		onClickOpenDevToolsForServer: (serverURL) => {
			webview.openDevTools(serverURL);
		},
		onSortServers: (serverURLs) => {
			sortServers(serverURLs);
		},
	});

	touchBar.setProps({
		onTouchFormattingButton: (buttonClass) => {
			if (webContents === getCurrentWebContents()) {
				return;
			}
			webContents.executeJavaScript(`
				var svg = document.querySelector("button svg[class$='${ buttonClass }']");
				svg && svg.parentNode.click();
				`.trim()
			);
		},
		onTouchServer: (serverURL) => {
			setActiveServerURL(serverURL);
		},
	});

	trayIcon.setProps({
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
		onDismiss: () => {
			setOpenModal(null);
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
			setOpenModal(null);
		},
		onRemindUpdateLater: () => {
			setOpenModal(null);
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
			setOpenModal(null);
		},
	});

	updates.setProps({
		onCheckingForUpdates: () => {
			setUpdateInfo({ isCheckingForUpdate: true });
		},
		onUpdateNotAvailable: () => {
			setUpdateInfo({
				newVersion: undefined,
				isCheckingForUpdate: false,
				updateMessage: t('dialog.about.noUpdatesAvailable'),
			});
		},
		onUpdateAvailable: (newVersion) => {
			setOpenModal('update');
			setUpdateInfo({
				newVersion,
				isCheckingForUpdate: false,
			});
		},
		onUpdateDownloaded: async () => {
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
		},
		onError: (error) => {
			setUpdateInfo({
				newVersion: undefined,
				isCheckingForUpdate: false,
				updateMessage: t('dialog.about.errorWhileLookingForUpdates'),
			});
			reportWarning(error);
		},
	});

	webview.setProps({
		onBadgeChange: (serverURL, badge) => {
			setBadge(serverURL, badge);
		},
		onBlur: () => {
			setWebContents(getCurrentWebContents());
		},
		onContextMenu: (serverURL, webContents, params) => {
			setWebContents(webContents);
			setEditingParams(params);
			setSpellCheckingCorrections(getSpellCheckingCorrections(params.selectionText));
			setSpellCheckingDictionaries(getSpellCheckingDictionaries().map((name) => ({
				name,
				enabled: getEnabledSpellCheckingDictionaries().includes(name),
			})));
			contextMenu.trigger();
		},
		onFocus: (serverURL, webContents) => {
			setWebContents(webContents);
		},
		onRequestFocus: (serverURL) => {
			mainWindow.activate();
			setActiveServerURL(serverURL);
			setWebContents(webContents);
			webContents.focus();
		},
		onRequestScreenSharing: () => {
			setOpenModal('screenSharing');
		},
		onSideBarStyleChange: (serverURL, style) => {
			setSideBarStyle(serverURL, style);
		},
		onTitleChange: (serverURL, title) => {
			setServerProperties(serverURL, { title });
		},
		onNavigate: (serverURL, url) => {
			setServerProperties(serverURL, { lastPath: url });
		},
	});
};
