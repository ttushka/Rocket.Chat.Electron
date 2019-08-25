import { remote } from 'electron';
import { useEffect } from 'react';
import { usePreferences } from './services/PreferencesProvider';
import { getTrayIconImage, getAppIconImage } from '../icon';
import { useGlobalBadge } from './services/ServersProvider';
import { usePrevious } from '../hooks/usePrevious';
import { useMainWindow } from './MainWindow';


const { app } = remote;

const getBadgeText = (badge) => {
	if (badge === '•') {
		return '•';
	}

	if (Number.isInteger(badge)) {
		return String(badge);
	}

	return '';
};

const getMentionCount = (badge) => (Number.isInteger(badge) ? badge : 0);

const useMacOSDock = () => {
	if (process.platform !== 'darwin') {
		return;
	}

	const badge = useGlobalBadge();

	useEffect(() => {
		app.dock.setBadge(getBadgeText(badge));
	}, [badge]);

	const previousBadge = usePrevious(badge);

	useEffect(() => {
		const count = getMentionCount(badge);
		const previousCount = getMentionCount(previousBadge);

		if (count > 0 && previousCount === 0) {
			app.dock.bounce();
		}
	}, [badge]);
};

const useMainWindowFlashFrame = () => {
	if (process.platform !== 'win32') {
		return;
	}

	const mainWindow = useMainWindow();
	const badge = useGlobalBadge();

	useEffect(() => {
		if (!mainWindow.isFocused()) {
			const count = getMentionCount(badge);
			mainWindow.flashFrame(count > 0);
		}
	}, [badge]);
};

const useMainWindowIcon = () => {
	if (process.platform !== 'linux' && process.platform !== 'win32') {
		return;
	}

	const mainWindow = useMainWindow();
	const badge = useGlobalBadge();
	const { hasTrayIcon } = usePreferences();

	useEffect(() => {
		const image = hasTrayIcon ? getAppIconImage() : getTrayIconImage({ badge });
		mainWindow.setIcon(image);
	}, [badge, hasTrayIcon]);
};

export function Dock() {
	useMacOSDock();
	useMainWindowFlashFrame();
	useMainWindowIcon();

	return null;
}
