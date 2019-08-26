import { remote } from 'electron';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { showMessageBox, showErrorBox } from '../dialogs';
import { AboutModal } from './modals/AboutModal';
import { ScreenSharingModal } from './modals/ScreenSharingModal';
import { UpdateModal } from './modals/UpdateModal';
import { useAutoUpdaterActions, useAutoUpdaterEvent } from './services/AutoUpdaterHandler';
import { useCertificateTrustRequestHandler } from './services/CertificatesHandler';
import { useDeepLinkingEvent } from './services/DeepLinkingHandler';
import { useSetOpenModal } from './services/OpenModalState';
import { useServers, useServersActions, useServerValidation } from './services/ServersProvider';
import { useSetOpenView } from './services/OpenViewState';
import { LandingView } from './views/LandingView';
import { WebViewsView } from './views/WebViewsView';
import {
	Outer,
	DraggableRegion,
	Inner,
	Views,
} from './Shell.styles';
import { useMainWindow, useActivateMainWindow } from './MainWindow';
import { SideBar } from './SideBar';


const { app } = remote;

export function Shell() {
	const servers = useServers();
	const {
		addServer,
		setActiveServerURL,
	} = useServersActions();
	const validateServerURL = useServerValidation();
	const setOpenModal = useSetOpenModal();
	const setOpenView = useSetOpenView();

	const mainWindow = useMainWindow();
	const activateMainWindow = useActivateMainWindow();

	const { quitAndInstallUpdate } = useAutoUpdaterActions();

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

	return (
		<Outer>
			<DraggableRegion />

			<Inner>
				<SideBar />
				<Views>
					<LandingView />
					<WebViewsView />
				</Views>
			</Inner>

			<>
				<AboutModal />
				<UpdateModal />
				<ScreenSharingModal />
			</>
		</Outer>
	);
}
