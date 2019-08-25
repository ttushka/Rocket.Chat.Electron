import { remote, shell } from 'electron';
import React from 'react';
import { LoadingSplash } from './LoadingSplash';
import { showMessageBox, showErrorBox } from '../dialogs';
import { useTranslation } from 'react-i18next';
import { requestAppDataReset } from '../userData';
import {
	PreferencesProvider,
	useMergePreferences,
} from './services/PreferencesProvider';
import {
	ServersProvider,
	useServers,
	useServersActions,
	useServerValidation,
} from './services/ServersProvider';
import { BasicAuthenticationHandler } from './services/BasicAuthenticationHandler';
import {
	AutoUpdaterHandler,
	useAutoUpdaterState,
	useAutoUpdaterActions,
	useAutoUpdaterEvent,
} from './services/AutoUpdaterHandler';
import {
	CertificatesHandler,
	useClearCertificates,
	useCertificateTrustRequestHandler,
} from './services/CertificatesHandler';
import { SideBar } from './SideBar';
import { DragBar } from './DragBar.styles';
import { LandingView } from './views/LandingView';
import {
	WebViewsView,
	useOpenDevToolsForWebView,
	useReloadWebView,
} from './views/WebViewsView';
import { AboutModal } from './modals/AboutModal';
import { UpdateModal } from './modals/UpdateModal';
import { ScreenSharingModal } from './modals/ScreenSharingModal';
import { Dock } from './Dock';
import {
	MainWindow,
	useActivateMainWindow,
	useMainWindow,
} from './MainWindow';
import { MenuBar } from './MenuBar';
import { TouchBar } from './TouchBar';
import { TrayIcon } from './TrayIcon';
import {
	DeepLinkingHandler,
	useDeepLinkingEvent,
} from './services/DeepLinkingHandler';
import {
	FocusedWebContentsHolder,
	useFocusedWebContents,
	useSetFocusedWebContents,
} from './services/FocusedWebContentsHolder';
import {
	OpenModalState,
	useOpenModal,
	useSetOpenModal,
} from './services/OpenModalState';
import { OpenViewState, useSetOpenView } from './services/OpenViewState';


const { app, getCurrentWebContents } = remote;

function AppInner() {
	const mainWindow = useMainWindow();

	const {
		canUpdate,
		canSetCheckForUpdatesOnStart,
		isCheckingForUpdates,
	} = useAutoUpdaterState();

	const {
		checkForUpdates,
		downloadUpdate,
		quitAndInstallUpdate,
		setSkippedVersion,
		setCheckForUpdatesOnStart,
	} = useAutoUpdaterActions();

	const focusedWebContents = useFocusedWebContents();
	const setFocusedWebContents = useSetFocusedWebContents();
	const openModal = useOpenModal();
	const setOpenModal = useSetOpenModal();

	const mergePreferences = useMergePreferences();

	const servers = useServers();
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

	const setOpenView = useSetOpenView();

	useAutoUpdaterEvent('update-available', () => {
		setOpenModal('update');
	});

	const { t } = useTranslation();

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

		mainWindow.removeAllListeners();
		app.removeAllListeners('window-all-closed');
		quitAndInstallUpdate();
	});

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

	useDeepLinkingEvent('add-server', async (serverURL) => {
		activateMainWindow();
		if (servers.some(({ url }) => url === serverURL)) {
			setActiveServerURL(serverURL);
			setOpenView('webViews');
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
	});

	const reloadWebView = useReloadWebView();
	const openDevToolsForWebView = useOpenDevToolsForWebView();

	return <>
		<MenuBar
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
				mainWindow.setFullScreen(isEnabled);
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
				activateMainWindow();
				setActiveServerURL(null);
				setOpenView('landing');
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
				activateMainWindow();
				setActiveServerURL(url);
				setOpenView('webViews');
			}}
			onToggleShowWindowOnUnreadChanged={(isEnabled) => {
				mergePreferences({ showWindowOnUnreadChanged: isEnabled });
			}}
		/>
		<DragBar />
		<SideBar
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
				setOpenView('landing');
			}}
			onClickServer={(serverURL) => {
				setActiveServerURL(serverURL);
				setOpenView('webViews');
			}}
		/>
		<>
			<WebViewsView
				onBadgeChange={(serverURL, badge) => {
					setServerProperties(serverURL, { badge });
				}}
				onBlur={() => {
					setFocusedWebContents(getCurrentWebContents());
				}}
				onFocus={(serverURL, webContents) => {
					setFocusedWebContents(webContents);
				}}
				onRequestScreenSharing={() => {
					setOpenModal('screenSharing');
				}}
				onSideBarStyleChange={(serverURL, style) => {
					setServerProperties(serverURL, { style });
				}}
				onRequestFocus={(serverURL) => {
					activateMainWindow();
					setActiveServerURL(serverURL);
					setOpenView('webViews');
					setFocusedWebContents(focusedWebContents);
					focusedWebContents.focus();
				}}
				onTitleChange={(serverURL, title) => {
					setServerProperties(serverURL, { title });
				}}
				onNavigate={(serverURL, url) => {
					setServerProperties(serverURL, { lastPath: url });
				}}
			/>
			<LandingView />
		</>
		<AboutModal
			visible={openModal === 'about'}
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
				focusedWebContents.send('screenshare-result', 'PermissionDeniedError');
			}}
			onSelectScreenSharingSource={(id) => {
				setOpenModal(null);
				focusedWebContents.send('screenshare-result', id);
			}}
		/>
		<Dock />
		<TrayIcon />
		<TouchBar />
	</>;
}

export function App() {
	return (
		<React.Suspense fallback={<LoadingSplash />}>
			<PreferencesProvider>
				<ServersProvider>
					<MainWindow>
						<AutoUpdaterHandler>
							<CertificatesHandler>
								<DeepLinkingHandler>
									<BasicAuthenticationHandler />
									<FocusedWebContentsHolder>
										<OpenModalState>
											<OpenViewState>
												<AppInner />
											</OpenViewState>
										</OpenModalState>
									</FocusedWebContentsHolder>
								</DeepLinkingHandler>
							</CertificatesHandler>
						</AutoUpdaterHandler>
					</MainWindow>
				</ServersProvider>
			</PreferencesProvider>
		</React.Suspense>
	);
}
