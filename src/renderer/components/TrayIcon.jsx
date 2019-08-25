import { remote } from 'electron';
import { useEffect, useMemo, useRef } from 'react';
import { useAppName } from '../hooks/useAppName';
import { usePreferences } from './services/PreferencesProvider';
import { useMainWindowState, useActivateMainWindow, useDeactivateMainWindow } from './MainWindow';
import { getTrayIconImage } from '../icon';
import { useGlobalBadge } from './services/ServersProvider';
import { useEventListener } from '../hooks/useEventListener';
import { useMacOSDarkMode } from '../hooks/useMacOSDarkMode';
import { useTranslation } from 'react-i18next';
import { useCallbackRef } from '../hooks/useCallbackRef';
import { useQuitApp } from '../hooks/useQuitApp';


const { Menu, Tray } = remote;

const useTrayIcon = () => {
	const trayIconRef = useRef();
	const { hasTrayIcon } = usePreferences();
	const badge = useGlobalBadge();
	const isMacOSDarkMode = useMacOSDarkMode();

	const image = useMemo(() => hasTrayIcon && getTrayIconImage({ badge, dark: isMacOSDarkMode }),
		[hasTrayIcon, badge, isMacOSDarkMode]);

	useEffect(() => {
		if (hasTrayIcon) {
			if (trayIconRef.current) {
				trayIconRef.current.setImage(image);
			} else {
				trayIconRef.current = new Tray(image);
			}
		} else if (trayIconRef.current) {
			trayIconRef.current.destroy();
			trayIconRef.current = null;
		}
	}, [hasTrayIcon, image]);

	return trayIconRef.current;
};

const useTrayIconTooltip = (trayIcon) => {
	const appName = useAppName();
	const badge = useGlobalBadge();
	const { t } = useTranslation();

	useEffect(() => {
		if (!trayIcon) {
			return;
		}

		if (badge === '•') {
			trayIcon.setToolTip(t('tray.tooltip.unreadMessage', { appName }));
			return;
		}

		if (Number.isInteger(badge)) {
			trayIcon.setToolTip(t('tray.tooltip.unreadMention', { appName, count: badge }));
			return;
		}

		trayIcon.setToolTip(t('tray.tooltip.noUnreadMessage', { appName }));
	}, [trayIcon, badge, appName]);
};

const useTrayIconTitle = (trayIcon) => {
	if (process.platform !== 'darwin') {
		return;
	}

	const badge = useGlobalBadge();

	useEffect(() => {
		if (!trayIcon) {
			return;
		}

		trayIcon.setTitle(Number.isInteger(badge) ? String(badge) : '');
	}, [trayIcon, badge]);
};

const useTrayIconContextMenu = (trayIcon) => {
	const { t } = useTranslation();
	const { isVisible: isMainWindowVisible } = useMainWindowState();
	const activateMainWindow = useActivateMainWindow();
	const deactivateMainWindow = useDeactivateMainWindow();
	const quitApp = useQuitApp();

	const onToggleMainWindow = () => {
		if (!isMainWindowVisible) {
			activateMainWindow();
			return;
		}

		deactivateMainWindow();
	};

	const onClickQuit = () => {
		quitApp();
	};

	const onToggleMainWindowRef = useCallbackRef(onToggleMainWindow);
	const onClickQuitRef = useCallbackRef(onClickQuit);

	useEffect(() => {
		if (!trayIcon) {
			return;
		}

		const template = [
			{
				label: !isMainWindowVisible ? t('tray.menu.show') : t('tray.menu.hide'),
				click: onToggleMainWindowRef,
			},
			{
				label: t('tray.menu.quit'),
				click: onClickQuitRef,
			},
		];

		const contextMenu = Menu.buildFromTemplate(template);

		trayIcon.setContextMenu(contextMenu);
	}, [trayIcon, isMainWindowVisible]);

	const handleRightClick = (event, bounds) => {
		trayIcon.popUpContextMenu(undefined, bounds);
	};

	useEventListener(trayIcon, 'right-click', handleRightClick);
};

const useTrayIconClick = (trayIcon) => {
	const { isVisible: isMainWindowVisible } = useMainWindowState();
	const activateMainWindow = useActivateMainWindow();
	const deactivateMainWindow = useDeactivateMainWindow();

	useEventListener(trayIcon, 'click', () => {
		if (isMainWindowVisible) {
			activateMainWindow();
			return;
		}

		deactivateMainWindow();
	});
};

export function TrayIcon() {
	const trayIcon = useTrayIcon();
	useTrayIconTooltip(trayIcon);
	useTrayIconTitle(trayIcon);
	useTrayIconContextMenu(trayIcon);
	useTrayIconClick(trayIcon);

	return null;
}
