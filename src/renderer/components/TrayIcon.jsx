import { useEffect } from 'react';
import trayIcon from '../trayIcon';
import { useAppName } from '../hooks/useAppName';
import { usePreferences } from './services/PreferencesProvider';
import { useMainWindowState } from './MainWindow';


export function TrayIcon(props) {
	const appName = useAppName();

	const { hasTrayIcon: visible } = usePreferences();
	const { isVisible: isMainWindowVisible } = useMainWindowState();

	useEffect(() => {
		trayIcon.setProps({
			appName,
			visible,
			isMainWindowVisible,
			...props,
		});
	});

	return null;
}
