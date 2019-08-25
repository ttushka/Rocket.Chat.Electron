import { remote } from 'electron';
import { useEffect, useState } from 'react';


const { systemPreferences } = remote;

export const useMacOSDarkMode = () => {
	if (process.platform !== 'darwin') {
		return false;
	}

	const [isDarkMode, setDarkMode] = useState(false);

	useEffect(() => {
		const darwinThemeSubscriberId = systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
			setDarkMode(systemPreferences.isDarkMode());
		});

		return () => {
			systemPreferences.unsubscribeNotification(darwinThemeSubscriberId);
		};
	}, []);

	return isDarkMode;
};
