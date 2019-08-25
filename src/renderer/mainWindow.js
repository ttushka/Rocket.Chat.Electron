import { remote } from 'electron';
import { readUserDataFile, writeUserDataFile } from './userData';


const { getCurrentWindow, screen } = remote;

const currentWindow = getCurrentWindow();
const mainWindowStateFileName = 'window-state-main.json';
let saveTimeout;
let defaultWidth;
let defaultHeight;
let mainWindowState;
let mainWindowProps = {
	hasTrayIcon: false,
	badge: undefined,
	showWindowOnUnreadChanged: false,
};

const loadMainWindowState = async () => {
	try {
		mainWindowState = {
			...mainWindowState,
			...(await readUserDataFile(mainWindowStateFileName, 'json') || {}),
		};
	} catch (error) {
		console.error('Failed to load main window state');
		console.error(error);
	}
};

const saveMainWindowState = async () => {
	if (saveTimeout) {
		clearTimeout(saveTimeout);
		saveTimeout = null;
	}

	try {
		await writeUserDataFile(mainWindowStateFileName, mainWindowState);
	} catch (error) {
		console.error('Failed to save main window state');
		console.error(error);
	}
};

const fetchMainWindowState = async () => {
	if (currentWindow.isDestroyed()) {
		return;
	}

	mainWindowState.isMaximized = currentWindow.isMaximized();
	mainWindowState.isMinimized = currentWindow.isMinimized();
	mainWindowState.isHidden = !currentWindow.isMinimized() && !currentWindow.isVisible();

	if (!mainWindowState.isMaximized && !mainWindowState.isHidden) {
		[mainWindowState.x, mainWindowState.y] = currentWindow.getPosition();
		[mainWindowState.width, mainWindowState.height] = currentWindow.getSize();
	}
};

const isInsideSomeScreen = () => screen.getAllDisplays()
	.some(({ bounds }) => (
		mainWindowState.x >= bounds.x
		&& mainWindowState.y >= bounds.y
		&& mainWindowState.x + mainWindowState.width <= bounds.x + bounds.width
		&& mainWindowState.y + mainWindowState.height <= bounds.y + bounds.height
	));

const applyMainWindowState = async () => {
	if (!isInsideSomeScreen()) {
		const { bounds } = screen.getPrimaryDisplay();
		mainWindowState.x = (bounds.width - defaultWidth) / 2;
		mainWindowState.y = (bounds.height - defaultHeight) / 2;
		mainWindowState.width = defaultWidth;
		mainWindowState.height = defaultHeight;
	}

	if (mainWindowState.x !== undefined && mainWindowState.y !== undefined) {
		currentWindow.setPosition(Math.floor(mainWindowState.x), Math.floor(mainWindowState.y), false);
	}

	if (mainWindowState.width !== undefined && mainWindowState.height !== undefined) {
		currentWindow.setSize(Math.floor(mainWindowState.width), Math.floor(mainWindowState.height), false);
	}

	if (mainWindowState.isMaximized) {
		currentWindow.maximize();
	} else if (mainWindowState.isMinimized) {
		currentWindow.minimize();
	} else {
		currentWindow.restore();
	}

	if (mainWindowState.isHidden) {
		currentWindow.hide();
	} else if (!mainWindowState.isMinimized) {
		currentWindow.show();
	}
};

const fetchAndSave = () => {
	fetchMainWindowState();

	if (saveTimeout) {
		clearTimeout(saveTimeout);
	}

	saveTimeout = setTimeout(saveMainWindowState, 1000);
};

const attachWindowStateHandling = async () => {
	([defaultWidth, defaultHeight] = currentWindow.getSize());

	mainWindowState = {
		width: defaultWidth,
		height: defaultHeight,
	};

	await loadMainWindowState();
	applyMainWindowState();

	const exitFullscreen = () => new Promise((resolve) => {
		if (currentWindow.isFullScreen()) {
			currentWindow.once('leave-full-screen', resolve);
			currentWindow.setFullScreen(false);
			return;
		}
		resolve();
	});

	const close = () => {
		currentWindow.blur();

		if (process.platform === 'darwin' || mainWindowProps.hasTrayIcon) {
			currentWindow.hide();
			return;
		}

		if (process.platform === 'win32') {
			currentWindow.minimize();
			return;
		}

		currentWindow.destroy();
	};

	const handleStateChange = () => {
		fetchAndSave();
	};

	currentWindow.on('resize', handleStateChange);
	currentWindow.on('move', handleStateChange);
	currentWindow.on('show', handleStateChange);
	currentWindow.on('hide', handleStateChange);
	currentWindow.on('enter-full-screen', handleStateChange);
	currentWindow.on('leave-full-screen', handleStateChange);
	currentWindow.on('close', async (event) => {
		if (!currentWindow) {
			return;
		}

		event.preventDefault();
		await exitFullscreen();
		close();
		fetchAndSave();
	});
};

export const setupMainWindowStateHandling = () => {
	attachWindowStateHandling();
};

export const setMainWindowProps = (partialProps) => {
	const prevProps = mainWindowProps;
	mainWindowProps = {
		...mainWindowProps,
		...partialProps,
	};

	const {
		badge,
		showWindowOnUnreadChanged,
	} = mainWindowProps;

	if (prevProps.badge !== badge && typeof badge === 'number' && showWindowOnUnreadChanged) {
		const mainWindow = currentWindow;
		if (!mainWindow.isFocused()) {
			mainWindow.once('focus', () => mainWindow.flashFrame(false));
			mainWindow.showInactive();
			mainWindow.flashFrame(true);
		}
	}
};
