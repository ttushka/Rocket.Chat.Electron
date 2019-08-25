import { remote } from 'electron';
import { t } from 'i18next';
import { useEffect } from 'react';
import { useAppName } from '../hooks/useAppName';
import { usePreferences } from './services/PreferencesProvider';
import { useMainWindowState } from './MainWindow';
import { getTrayIconImage } from '../icon';


const { Menu, systemPreferences, Tray } = remote;

let props = {
	visible: true,
	badge: null,
	isMainWindowVisible: true,
};
let trayIcon;
let darwinThemeSubscriberId;

const getIconTitle = ({ badge }) => (Number.isInteger(badge) ? String(badge) : '');

const getIconTooltip = ({ appName, badge }) => {
	if (badge === '•') {
		return t('tray.tooltip.unreadMessage', { appName });
	}

	if (Number.isInteger(badge)) {
		return t('tray.tooltip.unreadMention', { appName, count: badge });
	}

	return t('tray.tooltip.noUnreadMessage', { appName });
};

const createContextMenuTemplate = ({
	isMainWindowVisible,
	onToggleMainWindow,
	onClickQuit,
}) => ([
	{
		label: !isMainWindowVisible ? t('tray.menu.show') : t('tray.menu.hide'),
		click: onToggleMainWindow && onToggleMainWindow.bind(null, !isMainWindowVisible),
	},
	{
		label: t('tray.menu.quit'),
		click: onClickQuit && onClickQuit.bind(null),
	},
]);

const createIcon = () => {
	const {
		badge,
	} = props;

	const image = getTrayIconImage({ badge });

	if (trayIcon) {
		trayIcon.setImage(image);
		return;
	}

	trayIcon = new Tray(image);

	if (process.platform === 'darwin') {
		darwinThemeSubscriberId = systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
			trayIcon.setImage(getTrayIconImage({ badge }));
		});
	}

	trayIcon.on('right-click', (event, bounds) => trayIcon.popUpContextMenu(undefined, bounds));
};

const destroyIcon = () => {
	if (!trayIcon) {
		return;
	}

	if (process.platform === 'darwin' && darwinThemeSubscriberId) {
		systemPreferences.unsubscribeNotification(darwinThemeSubscriberId);
		darwinThemeSubscriberId = null;
	}

	trayIcon.destroy();
	trayIcon = null;
};

const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	const {
		visible,
		isMainWindowVisible,
		onToggleMainWindow,
	} = props;

	if (!visible) {
		destroyIcon();
		return;
	}

	createIcon();

	trayIcon.setToolTip(getIconTooltip(props));

	if (process.platform === 'darwin') {
		trayIcon.setTitle(getIconTitle(props));
	}

	trayIcon.removeAllListeners('click');
	onToggleMainWindow && trayIcon.addListener('click', onToggleMainWindow.bind(null, !isMainWindowVisible));

	const template = createContextMenuTemplate(props);
	const contextMenu = Menu.buildFromTemplate(template);
	trayIcon.setContextMenu(contextMenu);
};

export function TrayIcon(props) {
	const appName = useAppName();

	const { hasTrayIcon: visible } = usePreferences();
	const { isVisible: isMainWindowVisible } = useMainWindowState();

	useEffect(() => {
		setProps({
			appName,
			visible,
			isMainWindowVisible,
			...props,
		});
	});

	return null;
}
