import { remote, ipcRenderer } from 'electron';
import i18n from '../../i18n';


const getPathFromApp = (path) => `${ remote.app.getAppPath() }/app/${ path }`;

let window;

const open = () => {
	if (window) {
		return;
	}

	const mainWindow = remote.getCurrentWindow();
	window = new remote.BrowserWindow({
		width: 776,
		height: 600,
		useContentSize: true,
		center: true,
		resizable: false,
		minimizable: false,
		maximizable: false,
		fullscreen: false,
		fullscreenable: false,
		skipTaskbar: true,
		title: i18n.__('dialog.screenshare.title'),
		show: false,
		parent: mainWindow,
		modal: process.platform !== 'darwin',
		backgroundColor: '#F4F4F4',
		type: process.platform === 'darwin' ? 'desktop' : 'toolbar',
		webPreferences: {
			devTools: false,
			nodeIntegration: true,
		},
	});
	window.setMenuBarVisibility(false);

	window.once('ready-to-show', () => {
		window.show();
	});

	window.once('closed', () => {
		if (!window.resultSent) {
			mainWindow.webContents.send('screenshare-result', 'PermissionDeniedError');
		}
		window = null;
	});

	window.loadFile(getPathFromApp('public/dialogs/screenshare.html'));
};

const close = () => {
	if (!window) {
		return;
	}
	window.destroy();
};

const selectSource = (id) => {
	const mainWindow = remote.getCurrentWindow();
	mainWindow.webContents.send('screenshare-result', id);
	if (window) {
		window.resultSent = true;
		window.destroy();
	}
};

ipcRenderer.on('select-screenshare-source', (e, ...args) => selectSource(...args));

export default {
	open,
	close,
	selectSource,
};
