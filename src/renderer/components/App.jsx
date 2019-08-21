import { remote } from 'electron';
import React, { useEffect, useMemo } from 'react';
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
import { checkForUpdates, setAutoUpdate } from '../updates';
import webview from '../webview';
import basicAuth from '../basicAuth';
import certificates from '../certificates';
import { showMessageBox } from '../dialogs';
import { useTranslation } from 'react-i18next';
import spellChecking from '../spellChecking';


const { app } = remote;

export function App({
	isMainWindowVisible,
	isMainWindowFullScreen,
	servers,
	activeServerURL,
	preferences,
	sideBarStyles,
	badges,
	openModal,
	updateInfo,
	webContents,
	editingParams,
	spellCheckingCorrections,
	spellCheckingDictionaries,
	canUpdate,
	canAutoUpdate,
	canSetAutoUpdate,
}) {
	const {
		showWindowOnUnreadChanged,
		hasTrayIcon,
		isMenuBarVisible,
		isSideBarVisible,
	} = preferences;

	const mentionCount = useMemo(() => Object.values(badges)
		.filter((badge) => Number.isInteger(badge))
		.reduce((sum, count) => sum + count, 0), [badges]
	);
	const globalBadge = useMemo(() => mentionCount
		|| (Object.values(badges).some((badge) => !!badge) && '•')
		|| null, []);

	const { t } = useTranslation();

	useEffect(() => {
		aboutModal.setProps({
			visible: openModal === 'about',
			canUpdate,
			canAutoUpdate,
			canSetAutoUpdate,
			currentVersion: app.getVersion(),
			...updateInfo,
			onClickCheckForUpdates: () => {
				checkForUpdates();
			},
			onToggleCheckForUpdatesOnStart: (isEnabled) => {
				setAutoUpdate(isEnabled);
			},
		});

		basicAuth.setProps({});

		certificates.setProps({
			certificateTrustRequestHandler: async (webContents, certificateUrl, error, certificate, isReplacing) => {
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
			},
		});

		contextMenu.setProps({
			webContents,
			...editingParams,
			spellCheckingCorrections,
			spellCheckingDictionaries,
		});

		dock.setProps({
			hasTrayIcon,
			badge: globalBadge,
		});

		landingView.setProps({
			visible: !activeServerURL,
		});

		mainWindow.setProps({
			hasTrayIcon,
			showWindowOnUnreadChanged,
			badge: globalBadge,
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
		});

		screenSharingModal.setProps({
			visible: openModal === 'screenSharing',
		});

		sideBar.setProps({
			visible: isSideBarVisible,
			servers,
			activeServerURL,
			styles: sideBarStyles,
			badges,
		});

		spellChecking.setProps({});

		touchBar.setProps({
			servers,
			activeServerURL,
		});

		trayIcon.setProps({
			visible: hasTrayIcon,
			appName: app.getName(),
			isMainWindowVisible,
			badge: globalBadge,
		});

		updateModal.setProps({
			visible: openModal === 'update',
			currentVersion: app.getVersion(),
			...updateInfo,
		});

		webview.setProps({
			servers,
			activeServerURL,
			hasSideBarPadding: !isSideBarVisible,
		});
	});

	return (
		<React.Suspense fallback={<LoadingSplash />}>

		</React.Suspense>
	);
}
