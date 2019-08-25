import { remote } from 'electron';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useEventListener } from '../hooks/useEventListener';
import { setMainWindowProps } from '../mainWindow';
import { usePreferences } from './services/PreferencesProvider';
import { useGlobalBadge } from './services/ServersProvider';


const { app, getCurrentWindow } = remote;

const currentWindow = getCurrentWindow();

const activate = () => {
	if (process.platform === 'win32') {
		if (currentWindow.isVisible()) {
			currentWindow.focus();
		} else if (currentWindow.isMinimized()) {
			currentWindow.restore();
		} else {
			currentWindow.show();
		}

		return;
	}

	if (currentWindow.isMinimized()) {
		currentWindow.restore();
		return;
	}

	currentWindow.show();
	currentWindow.focus();
};

const fetchState = () => {
	const [x, y] = currentWindow.getPosition();
	const [width, height] = currentWindow.getSize();

	return {
		isFullScreen: currentWindow.isFullScreen(),
		isVisible: currentWindow.isVisible(),
		isMaximized: currentWindow.isMaximized(),
		isMinimized: currentWindow.isMinimized(),
		x,
		y,
		width,
		height,
	};
};

const MainWindowStateContext = createContext({});

export const useMainWindow = () => currentWindow;

export const useActivateMainWindow = () => activate;

export const useMainWindowState = () => useContext(MainWindowStateContext);

export function MainWindow({ children }) {
	const {
		hasTrayIcon,
		showWindowOnUnreadChanged,
	} = usePreferences();

	const badge = useGlobalBadge();

	useEffect(() => {
		setMainWindowProps({
			hasTrayIcon,
			showWindowOnUnreadChanged,
			badge,
		});
	}, [hasTrayIcon, showWindowOnUnreadChanged, badge]);

	const [state, setState] = useState(fetchState);

	const handleStateChange = () => {
		setState(fetchState());
	};

	useEventListener(currentWindow, 'resize', handleStateChange);
	useEventListener(currentWindow, 'move', handleStateChange);
	useEventListener(currentWindow, 'show', handleStateChange);
	useEventListener(currentWindow, 'hide', handleStateChange);
	useEventListener(currentWindow, 'enter-full-screen', handleStateChange);
	useEventListener(currentWindow, 'leave-full-screen', handleStateChange);

	const handleAppActivate = () => {
		activate();
	};

	useEventListener(app, 'activate', handleAppActivate);

	useEffect(() => {
		if (process.env.NODE_ENV === 'development') {
			currentWindow.webContents.openDevTools();
		}
	}, []);

	return <MainWindowStateContext.Provider value={state}>
		{children}
	</MainWindowStateContext.Provider>;
}
