import { remote, ipcRenderer } from 'electron';
import jetpack from 'fs-jetpack';

const focus = () => {
	const mainWindow = remote.getCurrentWindow();

	if (process.platform === 'win32') {
		if (mainWindow.isVisible()) {
			mainWindow.focus();
		} else if (mainWindow.isMinimized()) {
			mainWindow.restore();
		} else {
			mainWindow.show();
		}

		return;
	}

	if (mainWindow.isMinimized()) {
		mainWindow.restore();
		return;
	}

	mainWindow.show();
	mainWindow.focus();
};

ipcRenderer.on('focus', focus);

class WindowStateHandler {
	constructor(window, name) {
		this.window = window;
		this.name = name;
		[this.defaultWidth, this.defaultHeight] = window.getSize();

		this.state = {
			width: this.defaultWidth,
			height: this.defaultHeight,
		};
	}

	async load() {
		try {
			const userDataDir = jetpack.cwd(remote.app.getPath('userData'));
			this.state = {
				...this.state,
				...(await userDataDir.readAsync(`window-state-${ this.name }.json`, 'json') || {}),
			};
		} catch (error) {
			console.error(`Failed to load "${ this.name }" window state`);
			console.error(error);
		}
	}

	async save() {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}

		try {
			const userDataDir = jetpack.cwd(remote.app.getPath('userData'));
			await userDataDir.writeAsync(`window-state-${ this.name }.json`, this.state, {
				atomic: true,
			});
		} catch (error) {
			console.error(`Failed to save "${ this.name }" window state`);
			console.error(error);
		}
	}

	async fetch() {
		const { state, window } = this;

		if (window.isDestroyed()) {
			return;
		}

		state.isMaximized = window.isMaximized();
		state.isMinimized = window.isMinimized();
		state.isHidden = !window.isMinimized() && !window.isVisible();

		if (!state.isMaximized && !state.isHidden) {
			[state.x, state.y] = window.getPosition();
			[state.width, state.height] = window.getSize();
		}
	}

	async apply() {
		const { defaultWidth, defaultHeight, state, window } = this;

		if (!this.isInsideSomeScreen()) {
			const { bounds } = remote.screen.getPrimaryDisplay();
			state.x = (bounds.width - defaultWidth) / 2;
			state.y = (bounds.height - defaultHeight) / 2;
			state.width = defaultWidth;
			state.height = defaultHeight;
		}

		if (state.x !== undefined && state.y !== undefined) {
			window.setPosition(Math.floor(state.x), Math.floor(state.y), false);
		}

		if (state.width !== undefined && state.height !== undefined) {
			window.setSize(Math.floor(state.width), Math.floor(state.height), false);
		}

		if (state.isMaximized) {
			window.maximize();
		} else if (state.isMinimized) {
			window.minimize();
		} else {
			window.restore();
		}

		if (state.isHidden) {
			window.hide();
		} else if (!state.isMinimized) {
			window.show();
		}
	}

	isInsideSomeScreen() {
		const { state } = this;

		return remote.screen.getAllDisplays()
			.some(({ bounds }) => (
				state.x >= bounds.x &&
				state.y >= bounds.y &&
				state.x + state.width <= bounds.x + bounds.width &&
				state.y + state.height <= bounds.y + bounds.height
			));
	}

	fetchAndSave() {
		this.fetch();

		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}

		this.saveTimeout = setTimeout(() => this.save(), 1000);
	}
}

let state = {
	hideOnClose: false,
};

const setState = (partialState) => {
	state = {
		...state,
		...partialState,
	};
};

const attachWindowStateHandling = async (mainWindow) => {
	const windowStateHandler = new WindowStateHandler(mainWindow, 'main');
	await windowStateHandler.load();
	windowStateHandler.apply();

	const exitFullscreen = () => new Promise((resolve) => {
		if (mainWindow.isFullScreen()) {
			mainWindow.once('leave-full-screen', resolve);
			mainWindow.setFullScreen(false);
			return;
		}
		resolve();
	});

	const close = () => {
		mainWindow.blur();

		if (process.platform === 'darwin' || state.hideOnClose) {
			mainWindow.hide();
			return;
		}

		if (process.platform === 'win32') {
			mainWindow.minimize();
			return;
		}

		mainWindow.destroy();
	};

	mainWindow.on('resize', () => windowStateHandler.fetchAndSave());
	mainWindow.on('move', () => windowStateHandler.fetchAndSave());
	mainWindow.on('show', () => windowStateHandler.fetchAndSave());
	mainWindow.on('close', async (event) => {
		if (!mainWindow) {
			return;
		}

		event.preventDefault();
		await exitFullscreen();
		close();
		windowStateHandler.fetchAndSave();
	});

	mainWindow.on('set-state', setState);
};

export const setupMainWindowStateHandling = () => {
	attachWindowStateHandling(remote.getCurrentWindow());

	remote.app.on('activate', async () => {
		remote.getCurrentWindow().show();
	});

	if (process.env.NODE_ENV === 'development') {
		remote.getCurrentWebContents().openDevTools();
	}
};
