import { remote } from 'electron';
import React from 'react';
import { LoadingSplash } from './LoadingSplash';
import { showMessageBox, showErrorBox } from '../dialogs';
import { useTranslation } from 'react-i18next';
import {
	PreferencesProvider,
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
	useAutoUpdaterActions,
	useAutoUpdaterEvent,
} from './services/AutoUpdaterHandler';
import {
	CertificatesHandler,
	useCertificateTrustRequestHandler,
} from './services/CertificatesHandler';
import { SideBar } from './SideBar';
import { DragBar } from './DragBar.styles';
import { LandingView } from './views/LandingView';
import { WebViewsView } from './views/WebViewsView';
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
import { FocusedWebContentsHolder } from './services/FocusedWebContentsHolder';
import {
	OpenModalState,
	useSetOpenModal,
} from './services/OpenModalState';
import {
	OpenViewState,
	useSetOpenView,
} from './services/OpenViewState';


const { app } = remote;

function AppInner() {
	const mainWindow = useMainWindow();
	const { quitAndInstallUpdate } = useAutoUpdaterActions();
	const setOpenModal = useSetOpenModal();
	const servers = useServers();
	const {
		addServer,
		setActiveServerURL,
	} = useServersActions();
	const validateServerURL = useServerValidation();

	const activateMainWindow = useActivateMainWindow();

	const setOpenView = useSetOpenView();

	const { t } = useTranslation();

	useAutoUpdaterEvent('update-available', () => {
		setOpenModal('update');
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

	return null;
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
												<MenuBar />
												<DragBar />
												<SideBar />
												<>
													<LandingView />
													<WebViewsView />
												</>
												<>
													<AboutModal />
													<UpdateModal />
													<ScreenSharingModal />
												</>
												<Dock />
												<TrayIcon />
												<TouchBar />
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
