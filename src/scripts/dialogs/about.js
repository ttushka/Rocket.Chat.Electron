import { remote } from 'electron';
import i18n from '../../i18n';


const getPathFromApp = (path) => `${ remote.app.getAppPath() }/app/${ path }`;

let window;

const open = () => {
	if (window) {
		return;
	}

	const mainWindow = remote.getCurrentWindow();
	window = new remote.BrowserWindow({
		width: 400,
		height: 300,
		useContentSize: true,
		center: true,
		resizable: false,
		minimizable: false,
		maximizable: false,
		fullscreen: false,
		fullscreenable: false,
		skipTaskbar: true,
		title: i18n.__('dialog.about.title', { appName: remote.app.getName() }),
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
		window = null;
	});

	window.loadFile(getPathFromApp('public/dialogs/about.html'));
};

const close = () => {
	if (!window) {
		return;
	}
	window.destroy();
};

export default {
	open,
	close,
};
