import { useEffect } from 'react';
import dock from '../dock';
import { usePreferences } from './services/PreferencesProvider';


export function Dock(props) {
	const { hasTrayIcon } = usePreferences();

	useEffect(() => {
		dock.setProps({
			hasTrayIcon,
			...props,
		});
	});

	return null;
}
