import React, { useEffect } from 'react';
import mainWindow from '../mainWindow';


export const useActivateMainWindow = () => mainWindow.activate;

export function MainWindow({ children, ...props }) {
	useEffect(() => {
		mainWindow.setProps(props);
	});

	return <>{children}</>;
}
