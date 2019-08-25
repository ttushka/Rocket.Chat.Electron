import { remote } from 'electron';
import { useEffect } from 'react';
import { usePreferences } from './services/PreferencesProvider';
import { getTrayIconImage, getAppIconImage } from '../icon';


const { app, getCurrentWindow } = remote;

let props = {
	hasTrayIcon: false,
	badge: null,
};

const getBadgeText = ({ badge }) => {
	if (badge === '•') {
		return '•';
	}

	if (Number.isInteger(badge)) {
		return String(badge);
	}

	return '';
};

const setProps = (partialProps) => {
	const prevProps = props;
	props = {
		...props,
		...partialProps,
	};

	const {
		hasTrayIcon,
		badge,
	} = props;

	const {
		badge: previousBadge,
	} = prevProps;

	if (process.platform === 'darwin') {
		app.dock.setBadge(getBadgeText(props));
		const count = Number.isInteger(badge) ? badge : 0;
		const previousCount = Number.isInteger(previousBadge) ? previousBadge : 0;
		if (count > 0 && previousCount === 0) {
			app.dock.bounce();
		}
	}

	const mainWindow = getCurrentWindow();

	if (process.platform === 'linux' || process.platform === 'win32') {
		const image = hasTrayIcon ? getAppIconImage() : getTrayIconImage({ badge });
		mainWindow.setIcon(image);
	}

	if (!mainWindow.isFocused()) {
		const count = Number.isInteger(badge) ? badge : 0;
		mainWindow.flashFrame(count > 0);
	}
};

export function Dock(props) {
	const { hasTrayIcon } = usePreferences();

	useEffect(() => {
		setProps({
			hasTrayIcon,
			...props,
		});
	});

	return null;
}
