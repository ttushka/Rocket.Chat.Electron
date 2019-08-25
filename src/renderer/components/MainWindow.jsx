import { remote } from 'electron';
import React, { createContext, useContext, useEffect, useState } from 'react';
import mainWindow from '../mainWindow';
import { useEventListener } from '../hooks/useEventListener';


const { getCurrentWindow } = remote;

const currentWindow = getCurrentWindow();

const fetchState = () => ({
	isFullScreen: currentWindow.isFullScreen(),
	isVisible: currentWindow.isVisible(),
});

const MainWindowStateContext = createContext({});

export const useActivateMainWindow = () => mainWindow.activate;

export const useMainWindowState = () => useContext(MainWindowStateContext);

export function MainWindow({ children, ...props }) {
	useEffect(() => {
		mainWindow.setProps({
			...props,
		});
	});

	const [state, setState] = useState(fetchState());

	const handleStateChange = () => {
		setState(fetchState());
	};

	useEventListener(currentWindow, 'resize', handleStateChange);
	useEventListener(currentWindow, 'move', handleStateChange);
	useEventListener(currentWindow, 'show', handleStateChange);
	useEventListener(currentWindow, 'hide', handleStateChange);
	useEventListener(currentWindow, 'enter-full-screen', handleStateChange);
	useEventListener(currentWindow, 'leave-full-screen', handleStateChange);

	return <MainWindowStateContext.Provider value={state}>
		{children}
	</MainWindowStateContext.Provider>;
}
