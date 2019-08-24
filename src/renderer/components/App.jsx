import { remote, shell } from 'electron';
import React, { useEffect, useMemo, useState } from 'react';
import { LoadingSplash } from './LoadingSplash';
import { showMessageBox, showErrorBox } from '../dialogs';
import { useTranslation } from 'react-i18next';
import spellChecking from '../spellChecking';
import { requestAppDataReset } from '../userData';
import deepLinks from '../deepLinks';
import {
	PreferencesProvider,
	usePreferences,
	useMergePreferences,
} from './services/PreferencesProvider';
import {
	ServersProvider,
	useServers,
	useActiveServer,
	useServersActions,
	useServerValidation,
} from './services/ServersProvider';
import { BasicAuthentication } from './services/BasicAuthentication';
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
} from './services/CertificatesHandler';
import { SideBar } from './SideBar';
import { DragBar } from './DragBar.styles';
import { LandingView } from './LandingView';
import {
	WebViewsView,
	useOpenDevToolsForWebView,
	useReloadWebView,
} from './WebViewsView';
import { AboutModal } from './AboutModal';
import { UpdateModal } from './UpdateModal';
import { ScreenSharingModal } from './ScreenSharingModal';
import { Dock } from './Dock';
import {
	MainWindow,
	useActivateMainWindow,
} from './MainWindow';
import { MenuBar } from './MenuBar';
import { TouchBar } from './TouchBar';
import { TrayIcon } from './TrayIcon';


const { app, getCurrentWebContents, getCurrentWindow } = remote;

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

	const activateMainWindow = useActivateMainWindow();

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
		deepLinks.setProps({
			onAddHost: async (serverURL) => {
				activateMainWindow();
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

		spellChecking.setProps({});
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

	const reloadWebView = useReloadWebView();

	const openDevToolsForWebView = useOpenDevToolsForWebView();

	return <MainWindow
		hasTrayIcon={hasTrayIcon}
		showWindowOnUnreadChanged={showWindowOnUnreadChanged}
		badge={globalBadge}
		onStateChange={update}
	>
		<MenuBar
			servers={servers}
			activeServerURL={activeServerURL}
			hasTrayIcon={hasTrayIcon}
			isFullScreen={isMainWindowFullScreen}
			isMenuBarVisible={isMenuBarVisible}
			isSideBarVisible={isSideBarVisible}
			showWindowOnUnreadChanged={showWindowOnUnreadChanged}
			webContents={webContents}
			appName={app.getName()}
			onClickShowAbout={() => {
				setOpenModal('about');
			}}
			onClickQuit={() => {
				app.quit();
			}}
			onClickUndo={(webContents) => {
				webContents.undo();
			}}
			onClickRedo={(webContents) => {
				webContents.redo();
			}}
			onClickCut={(webContents) => {
				webContents.cut();
			}}
			onClickCopy={(webContents) => {
				webContents.copy();
			}}
			onClickPaste={(webContents) => {
				webContents.paste();
			}}
			onClickSelectAll={(webContents) => {
				webContents.selectAll();
			}}
			onClickReload={(webContents) => {
				if (webContents === getCurrentWebContents()) {
					return;
				}
				webContents.reload();
			}}
			onClickReloadIgnoringCache={(webContents) => {
				if (webContents === getCurrentWebContents()) {
					return;
				}
				webContents.reloadIgnoringCache();
			}}
			onClickClearCertificates={() => {
				clearCertificates();
			}}
			onClickOpenDevToolsForServer={(webContents) => {
				if (webContents === getCurrentWebContents()) {
					return;
				}
				webContents.openDevTools();
			}}
			onClickGoBack={(webContents) => {
				if (webContents === getCurrentWebContents()) {
					return;
				}
				webContents.goBack();
			}}
			onClickGoForward={(webContents) => {
				if (webContents === getCurrentWebContents()) {
					return;
				}
				webContents.goForward();
			}}
			onToggleFullScreen={(isEnabled) => {
				getCurrentWindow().setFullScreen(isEnabled);
			}}
			onClickResetZoom={() => {
				getCurrentWebContents().setZoomLevel(0);
			}}
			onClickZoomIn={() => {
				const newZoomLevel = Math.min(getCurrentWebContents().getZoomLevel() + 1, 9);
				getCurrentWebContents().setZoomLevel(newZoomLevel);
			}}
			onClickZoomOut={() => {
				const newZoomLevel = Math.max(getCurrentWebContents().getZoomLevel() - 1, -9);
				getCurrentWebContents().setZoomLevel(newZoomLevel);
			}}
			onClickReloadApp={() => {
				getCurrentWebContents().reloadIgnoringCache();
			}}
			onToggleAppDevTools={() => {
				getCurrentWebContents().toggleDevTools();
			}}
			onClickOpenURL={(url) => {
				shell.openExternal(url);
			}}
			onClickResetAppData={async () => {
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
			}}
			onClickAddNewServer={() => {
				getCurrentWindow().show();
				setActiveServerURL(null);
			}}
			onToggleTrayIcon={(isEnabled) => {
				mergePreferences({ hasTrayIcon: isEnabled });
			}}
			onToggleMenuBar={(isEnabled) => {
				mergePreferences({ isMenuBarVisible: isEnabled });
			}}
			onToggleSideBar={(isEnabled) => {
				mergePreferences({ isSideBarVisible: isEnabled });
			}}
			onClickSelectServer={({ url }) => {
				getCurrentWindow().show();
				setActiveServerURL(url);
			}}
			onToggleShowWindowOnUnreadChanged={(isEnabled) => {
				mergePreferences({ showWindowOnUnreadChanged: isEnabled });
			}}
		/>
		<DragBar />
		<SideBar
			visible={isSideBarVisible}
			servers={servers}
			activeServerURL={activeServerURL}
			styles={sideBarStyles}
			badges={badges}
			onClickReloadServer={(serverURL) => {
				reloadWebView(serverURL);
			}}
			onClickRemoveServer={(serverURL) => {
				removeServer(serverURL);
			}}
			onClickOpenDevToolsForServer={(serverURL) => {
				openDevToolsForWebView(serverURL);
			}}
			onSortServers={(serverURLs) => {
				sortServers(serverURLs);
			}}
			onClickAddServer={() => {
				setActiveServerURL(null);
			}}
			onClickServer={(serverURL) => {
				setActiveServerURL(serverURL);
			}}
		/>
		<WebViewsView
			servers={servers}
			activeServerURL={activeServerURL}
			hasSideBarPadding={!isSideBarVisible}
			onBadgeChange={(serverURL, badge) => {
				setBadges({
					...badges,
					[serverURL]: badge || null,
				});
			}}
			onBlur={() => {
				setWebContents(getCurrentWebContents());
			}}
			onFocus={(serverURL, webContents) => {
				setWebContents(webContents);
			}}
			onRequestScreenSharing={() => {
				setOpenModal('screenSharing');
			}}
			onSideBarStyleChange={(serverURL, style) => {
				setSideBarStyles({
					...sideBarStyles,
					[serverURL]: style || null,
				});
			}}
			onRequestFocus={(serverURL) => {
				activateMainWindow();
				setActiveServerURL(serverURL);
				setWebContents(webContents);
				webContents.focus();
			}}
			onTitleChange={(serverURL, title) => {
				setServerProperties(serverURL, { title });
			}}
			onNavigate={(serverURL, url) => {
				setServerProperties(serverURL, { lastPath: url });
			}}
		/>
		<LandingView
			visible={!activeServerURL}
			addServer={addServer}
			validateServerURL={validateServerURL}
		/>
		<AboutModal
			visible={openModal === 'about'}
			canUpdate={canUpdate}
			canAutoUpdate={doesCheckForUpdatesOnStart}
			canSetAutoUpdate={canSetCheckForUpdatesOnStart}
			currentVersion={app.getVersion()}
			isCheckingForUpdates={isCheckingForUpdates}
			updateMessage={updateMessage}
			onDismiss={() => {
				setOpenModal(null);
			}}
			onClickCheckForUpdates={() => {
				if (!canUpdate || isCheckingForUpdates) {
					return;
				}

				checkForUpdates();
			}}
			onToggleCheckForUpdatesOnStart={(isEnabled) => {
				if (!canSetCheckForUpdatesOnStart) {
					return;
				}

				setCheckForUpdatesOnStart(isEnabled);
			}}
		/>
		<UpdateModal
			visible={openModal === 'update'}
			currentVersion={app.getVersion()}
			newVersion={newVersion}
			onDismiss={() => {
				setOpenModal(null);
			}}
			onSkipUpdateVersion={async (version) => {
				await showMessageBox({
					type: 'warning',
					title: t('dialog.updateSkip.title'),
					message: t('dialog.updateSkip.message'),
					buttons: [t('dialog.updateSkip.ok')],
					defaultId: 0,
				});
				setSkippedVersion(version);
				setOpenModal(null);
			}}
			onRemindUpdateLater={() => {
				setOpenModal(null);
			}}
			onInstallUpdate={async () => {
				await showMessageBox({
					type: 'info',
					title: t('dialog.updateDownloading.title'),
					message: t('dialog.updateDownloading.message'),
					buttons: [t('dialog.updateDownloading.ok')],
					defaultId: 0,
				});
				downloadUpdate();
				setOpenModal(null);
			}}
		/>
		<ScreenSharingModal
			visible={openModal === 'screenSharing'}
			onDismiss={() => {
				setOpenModal(null);
				webContents.send('screenshare-result', 'PermissionDeniedError');
			}}
			onSelectScreenSharingSource={(id) => {
				setOpenModal(null);
				webContents.send('screenshare-result', id);
			}}
		/>
		<Dock
			hasTrayIcon={hasTrayIcon}
			badge={globalBadge}
		/>
		<TrayIcon
			visible={hasTrayIcon}
			appName={app.getName()}
			isMainWindowVisible={isMainWindowVisible}
			badge={globalBadge}
			onToggleMainWindow={(isVisible) => {
				if (isVisible) {
					getCurrentWindow().show();
					return;
				}

				getCurrentWindow().hide();
			}}
			onClickQuit={() => {
				app.quit();
			}}
		/>
		<TouchBar
			servers={servers}
			activeServerURL={activeServerURL}
			onTouchFormattingButton={(buttonClass) => {
				if (webContents === getCurrentWebContents()) {
					return;
				}
				webContents.executeJavaScript(`
					var svg = document.querySelector("button svg[class$='${ buttonClass }']");
					svg && svg.parentNode.click();
					`.trim()
				);
			}}
			onTouchServer={(serverURL) => {
				setActiveServerURL(serverURL);
			}}
		/>
	</MainWindow>;
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
