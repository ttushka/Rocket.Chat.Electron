import { useEffect, useMemo } from 'react';
import menus from '../menus';
import { useServers } from './services/ServersProvider';
import { usePreferences } from './services/PreferencesProvider';
import { useMainWindowState } from './MainWindow';
import { useAppName } from '../hooks/useAppName';


export function MenuBar(props) {
	const appName = useAppName();
	const servers = useServers();
	const activeServerURL = useMemo(() => (servers.find(({ isActive }) => isActive) || {}).url, [servers]);
	const {
		showWindowOnUnreadChanged,
		hasTrayIcon,
		isMenuBarVisible,
		isSideBarVisible,
	} = usePreferences();
	const { isFullScreen } = useMainWindowState();

	useEffect(() => {
		menus.setProps({
			servers,
			activeServerURL,
			hasTrayIcon,
			isFullScreen,
			isMenuBarVisible,
			isSideBarVisible,
			showWindowOnUnreadChanged,
			appName,
			...props,
		});
	});

	return null;
}
