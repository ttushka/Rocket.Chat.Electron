import { remote, shell, clipboard } from 'electron';
import React, { useEffect, useMemo, useState } from 'react';
import { LoadingSplash } from './LoadingSplash';
import aboutModal from '../aboutModal';
import contextMenu from '../contextMenu';
import dock from '../dock';
import landingView from '../landingView';
import mainWindow from '../mainWindow';
import menus from '../menus';
import screenSharingModal from '../screenSharingModal';
import sideBar from '../sideBar';
import touchBar from '../touchBar';
import trayIcon from '../trayIcon';
import updateModal from '../updateModal';
import webview from '../webview';
import { showMessageBox, showOpenDialog, showErrorBox } from '../dialogs';
import { useTranslation } from 'react-i18next';
import spellChecking, { getSpellCheckingCorrections, getSpellCheckingDictionaries, getEnabledSpellCheckingDictionaries, setSpellCheckingDictionaryEnabled, getSpellCheckingDictionariesPath, installSpellCheckingDictionaries } from '../spellChecking';
import { reportError } from '../../errorHandling';
import { requestAppDataReset } from '../userData';
import deepLinks from '../deepLinks';
import { PreferencesProvider, usePreferences, useMergePreferences } from './PreferencesProvider';
import { ServersProvider, useServers, useActiveServer, useServersActions, useServerValidation } from './ServersProvider';
import { BasicAuthentication } from './BasicAuthentication';
import {
	AutoUpdaterHandler,
	useAutoUpdaterState,
	useAutoUpdaterActions,
	useAutoUpdaterEvent,
} from './AutoUpdaterHandler';
import {
	CertificatesHandler,
	useCertificateTrustRequestHandler,
	useClearCertificates,
} from './CertificatesHandler';


const { app, getCurrentWebContents, getCurrentWindow } = remote;

function AppMarkup() {
	return <>
		<div className='sidebar sidebar--hidden'>
			<div className='sidebar__inner'>
				<ol className='sidebar__list sidebar__server-list'>
				</ol>
				<button className='sidebar__action sidebar__add-server' data-tooltip='Add server'>
					<span className='sidebar__action-label'>+</span>
				</button>
			</div>
		</div>

		<section className='landing-view'>
			<div className='wrapper'>
				<header>
					<img className='logo' src='./images/logo-dark.svg' />
				</header>

				<div className='loading-indicator'>
					<span className='dot'></span>
					<span className='dot'></span>
					<span className='dot'></span>
				</div>

				<form id='login-card' method='/'>
					<header>
						<h2 className='connect__prompt'>Enter your server URL</h2>
					</header>
					<div className='fields'>
						<div className='input-text active'>
							<input type='text' name='host' placeholder='https://open.rocket.chat' dir='auto' />
						</div>
					</div>

					<div id='invalidUrl' style={{ display: 'none' }} className='alert alert-danger'>No valid server found</div>

					<div className='connect__error alert alert-danger only-offline'>Check connection</div>

					<div className='submit'>
						<button type='submit' data-loading-text='Connecting...' className='button primary login'>Connect</button>
					</div>
				</form>
			</div>
		</section>

		<dialog className='about-modal'>
			<section className='app-info'>
				<div className='app-logo'>
					<img src='./images/logo.svg' />
				</div>
				<div className='app-version'>
				Version <span className='version'>%s</span>
				</div>
			</section>

			<section className='updates hidden'>
				<button className='check-for-updates button primary'>
				Check for Updates
				</button>

				<div className='checking-for-updates hidden'>
					<span className='dot'></span>
					<span className='dot'></span>
					<span className='dot'></span>
					<span className='message'></span>
				</div>

				<label className='check-for-updates-on-start__label'>
					<input className='check-for-updates-on-start' type='checkbox' defaultChecked /> <span>Check for Updates on Start</span>
				</label>
			</section>

			<div className='copyright'></div>
		</dialog>

		<dialog className='update-modal'>
			<div className='update-content'>
				<h1 className='update-title'>New Update is Available</h1>
				<p className='update-message'>A new version of the Rocket.Chat Desktop App is available!</p>

				<div className='update-info'>
					<div className='app-version current-version'>
						<div className='app-version-label'>Current Version:</div>
						<div className='app-version-value'>a.b.c</div>
					</div>
					<div className='update-arrow'>&rarr;</div>
					<div className='app-version new-version'>
						<div className='app-version-label'>New Version:</div>
						<div className='app-version-value'>x.y.z</div>
					</div>
				</div>
			</div>

			<div className='update-actions'>
				<button className='update-skip-action button secondary'>Skip This Version</button>
				<button className='update-remind-action button secondary'>Remind Me Later</button>
				<button className='update-install-action button primary'>Install Update</button>
			</div>
		</dialog>

		<dialog className='screen-sharing-modal'>
			<template className='screenshare-source-template'>
				<div className='screenshare-source'>
					<div className='screenshare-source-thumbnail'>
						<img src='' alt='' />
					</div>
					<div className='screenshare-source-name'></div>
				</div>
			</template>
			<h1 className='screenshare-title'>Select a screen to share</h1>
			<div className='screenshare-sources'></div>
		</dialog>

		<div className="webviews" />

		<div className='drag-region'></div>
	</>;
}

function AppInner() {
	const { t } = useTranslation();

	const isMainWindowVisible = getCurrentWindow().isVisible();
	const isMainWindowFullScreen = getCurrentWindow().isFullScreen();

	const {
		canUpdate,
		canSetCheckForUpdatesOnStart,
		doesCheckForUpdatesOnStart,
		newVersion,
		isCheckingForUpdates,
	} = useAutoUpdaterState();

	const [updateMessage, setUpdateMessage] = useState(null);

	const {
		checkForUpdates,
		downloadUpdate,
		quitAndInstallUpdate,
		setSkippedVersion,
		setCheckForUpdatesOnStart,
	} = useAutoUpdaterActions();

	useCertificateTrustRequestHandler(async (webContents, certificateUrl, error, certificate, isReplacing) => {
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

	const [sideBarStyles, setSideBarStyles] = useState({});
	const [badges, setBadges] = useState({});
	const [openModal, setOpenModal] = useState(null);
	const [webContents, setWebContents] = useState(getCurrentWebContents());
	const [editingParams, setEditingParams] = useState({});
	const [spellCheckingCorrections, setSpellCheckingCorrections] = useState([]);
	const [spellCheckingDictionaries, setSpellCheckingDictionaries] = useState([]);

	const [, _update] = useState(0);
	const update = () => _update((count) => count + 1);

	const {
		showWindowOnUnreadChanged,
		hasTrayIcon,
		isMenuBarVisible,
		isSideBarVisible,
	} = usePreferences();

	const mergePreferences = useMergePreferences();

	const mentionCount = useMemo(() => Object.values(badges)
		.filter((badge) => Number.isInteger(badge))
		.reduce((sum, count) => sum + count, 0), [badges]
	);
	const globalBadge = useMemo(() => mentionCount
		|| (Object.values(badges).some((badge) => !!badge) && '•')
		|| null, []);

	const servers = useServers();
	const { url: activeServerURL } = useActiveServer() || {};
	const {
		addServer,
		removeServer,
		sortServers,
		setServerProperties,
		setActiveServerURL,
	} = useServersActions();
	const validateServerURL = useServerValidation();

	const clearCertificates = useClearCertificates();

	useEffect(() => {
		const handleFocus = () => {
			webContents.focus();
		};
		window.addEventListener('focus', handleFocus);

		return () => {
			window.removeEventListener('focus', handleFocus);
		};
	}, [webContents]);

	useEffect(() => {
		aboutModal.setProps({
			visible: openModal === 'about',
			canUpdate,
			canAutoUpdate: doesCheckForUpdatesOnStart,
			canSetAutoUpdate: canSetCheckForUpdatesOnStart,
			currentVersion: app.getVersion(),
			isCheckingForUpdates,
			updateMessage,
			onDismiss: () => {
				setOpenModal(null);
			},
			onClickCheckForUpdates: () => {
				if (!canUpdate || isCheckingForUpdates) {
					return;
				}

				checkForUpdates();
			},
			onToggleCheckForUpdatesOnStart: (isEnabled) => {
				if (!canSetCheckForUpdatesOnStart) {
					return;
				}

				setCheckForUpdatesOnStart(isEnabled);
			},
		});

		contextMenu.setProps({
			webContents,
			...editingParams,
			spellCheckingCorrections,
			spellCheckingDictionaries,
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

		dock.setProps({
			hasTrayIcon,
			badge: globalBadge,
		});

		landingView.setProps({
			visible: !activeServerURL,
			addServer,
			validateServerURL,
		});

		mainWindow.setProps({
			hasTrayIcon,
			showWindowOnUnreadChanged,
			badge: globalBadge,
			onStateChange: update,
		});

		menus.setProps({
			servers,
			activeServerURL,
			hasTrayIcon,
			isFullScreen: isMainWindowFullScreen,
			isMenuBarVisible,
			isSideBarVisible,
			showWindowOnUnreadChanged,
			webContents,
			appName: app.getName(),
			onClickShowAbout: () => {
				setOpenModal('about');
			},
			onClickQuit: () => {
				app.quit();
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
				clearCertificates();
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
			onToggleFullScreen: (isEnabled) => {
				getCurrentWindow().setFullScreen(isEnabled);
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
			onClickReloadApp: () => {
				getCurrentWebContents().reloadIgnoringCache();
			},
			onToggleAppDevTools: () => {
				getCurrentWebContents().toggleDevTools();
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
			onClickAddNewServer: () => {
				getCurrentWindow().show();
				setActiveServerURL(null);
			},
			onToggleTrayIcon: (isEnabled) => {
				mergePreferences({ hasTrayIcon: isEnabled });
			},
			onToggleMenuBar: (isEnabled) => {
				mergePreferences({ isMenuBarVisible: isEnabled });
			},
			onToggleSideBar: (isEnabled) => {
				mergePreferences({ isSideBarVisible: isEnabled });
			},
			onClickSelectServer: ({ url }) => {
				getCurrentWindow().show();
				setActiveServerURL(url);
			},
			onToggleShowWindowOnUnreadChanged: (isEnabled) => {
				mergePreferences({ showWindowOnUnreadChanged: isEnabled });
			},
		});

		screenSharingModal.setProps({
			visible: openModal === 'screenSharing',
			onDismiss: () => {
				setOpenModal(null);
				webContents.send('screenshare-result', 'PermissionDeniedError');
			},
			onSelectScreenSharingSource: (id) => {
				setOpenModal(null);
				webContents.send('screenshare-result', id);
			},
		});

		sideBar.setProps({
			visible: isSideBarVisible,
			servers,
			activeServerURL,
			styles: sideBarStyles,
			badges,
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
			onClickAddServer: () => {
				setActiveServerURL(null);
			},
			onClickServer: (serverURL) => {
				setActiveServerURL(serverURL);
			},
		});

		spellChecking.setProps({});

		touchBar.setProps({
			servers,
			activeServerURL,
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
			visible: hasTrayIcon,
			appName: app.getName(),
			isMainWindowVisible,
			badge: globalBadge,
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
			visible: openModal === 'update',
			currentVersion: app.getVersion(),
			newVersion,
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
				setSkippedVersion(version);
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

		webview.setProps({
			servers,
			activeServerURL,
			hasSideBarPadding: !isSideBarVisible,
			onBadgeChange: (serverURL, badge) => {
				setBadges({
					...badges,
					[serverURL]: badge || null,
				});
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
			onRequestScreenSharing: () => {
				setOpenModal('screenSharing');
			},
			onSideBarStyleChange: (serverURL, style) => {
				setSideBarStyles({
					...sideBarStyles,
					[serverURL]: style || null,
				});
			},
			onRequestFocus: (serverURL) => {
				mainWindow.activate();
				setActiveServerURL(serverURL);
				setWebContents(webContents);
				webContents.focus();
			},
			onTitleChange: (serverURL, title) => {
				setServerProperties(serverURL, { title });
			},
			onNavigate: (serverURL, url) => {
				setServerProperties(serverURL, { lastPath: url });
			},
		});
	});

	useAutoUpdaterEvent('update-available', () => {
		setOpenModal('update');
	});

	useAutoUpdaterEvent('update-not-available', () => {
		setUpdateMessage(t('dialog.about.noUpdatesAvailable'));
	});

	useAutoUpdaterEvent('update-downloaded', async () => {
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

	useAutoUpdaterEvent('error', () => {
		setUpdateMessage(t('dialog.about.errorWhileLookingForUpdates'));
	});

	return <AppMarkup />;
}

export function App() {
	return (
		<React.Suspense fallback={<LoadingSplash />}>
			<PreferencesProvider>
				<ServersProvider>
					<AutoUpdaterHandler>
						<CertificatesHandler>
							<BasicAuthentication />
							<AppInner />
						</CertificatesHandler>
					</AutoUpdaterHandler>
				</ServersProvider>
			</PreferencesProvider>
		</React.Suspense>
	);
}
