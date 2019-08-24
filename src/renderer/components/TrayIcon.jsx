import { useEffect } from 'react';
import trayIcon from '../trayIcon';


export function TrayIcon(props) {
	useEffect(() => {
		trayIcon.setProps(props);
	});

	return null;
}
