import { remote, shell } from 'electron';
import { t } from 'i18next';
import { useEffect, useMemo } from 'react';
import { useAppName } from '../hooks/useAppName';
import { useServers, useActiveServer, useServersActions } from './services/ServersProvider';
import { usePreferences, useMergePreferences } from './services/PreferencesProvider';
import { useMainWindowState, useMainWindow, useActivateMainWindow } from './MainWindow';
import { useFocusedWebContents } from './services/FocusedWebContentsHolder';
import { useSetOpenModal } from './services/OpenModalState';
import { useQuitApp } from '../hooks/useQuitApp';
import { useClearCertificates } from './services/CertificatesHandler';
import { showMessageBox } from '../dialogs';
import { requestAppDataReset } from '../userData';
import { useSetOpenView } from './services/OpenViewState';


const { getCurrentWindow, Menu } = remote;

let props = {};
let menu;

const createAppMenuTemplate = ({
	appName,
	onClickShowAbout,
	onClickQuit,
	onClickAddNewServer,
}) => ({
	label: process.platform === 'darwin' ? appName : t('menus.fileMenu'),
	submenu: [
		...(process.platform === 'darwin' ? [
			{
				id: 'about',
				label: t('menus.about', { appName }),
				click: onClickShowAbout && onClickShowAbout.bind(null),
			},
			{
				type: 'separator',
			},
			{
				submenu: [],
				role: 'services',
			},
			{
				type: 'separator',
			},
			{
				accelerator: 'Command+H',
				role: 'hide',
			},
			{
				accelerator: 'Command+Alt+H',
				role: 'hideothers',
			},
			{
				role: 'unhide',
			},
			{
				type: 'separator',
			},
		] : []),
		...(process.platform !== 'darwin' ? [
			{
				label: t('menus.addNewServer'),
				accelerator: 'Control+N',
				click: onClickAddNewServer && onClickAddNewServer.bind(null),
			},
		] : []),
		{
			type: 'separator',
		},
		{
			id: 'quit',
			label: t('menus.quit', { appName }),
			accelerator: 'CommandOrControl+Q',
			click: onClickQuit && onClickQuit.bind(null),
		},
	],
});

const createEditMenuTemplate = ({
	webContents,
	onClickUndo,
	onClickRedo,
	onClickCut,
	onClickCopy,
	onClickPaste,
	onClickSelectAll,
}) => ({
	label: t('menus.editMenu'),
	submenu: [
		{
			label: t('menus.undo'),
			accelerator: 'CommandOrControl+Z',
			click: onClickUndo && onClickUndo.bind(null, webContents),
		},
		{
			label: t('menus.redo'),
			accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
			click: onClickRedo && onClickRedo.bind(null, webContents),
		},
		{
			type: 'separator',
		},
		{
			label: t('menus.cut'),
			accelerator: 'CommandOrControl+X',
			click: onClickCut && onClickCut.bind(null, webContents),
		},
		{
			label: t('menus.copy'),
			accelerator: 'CommandOrControl+C',
			click: onClickCopy && onClickCopy.bind(null, webContents),
		},
		{
			label: t('menus.paste'),
			accelerator: 'CommandOrControl+V',
			click: onClickPaste && onClickPaste.bind(null, webContents),
		},
		{
			label: t('menus.selectAll'),
			accelerator: 'CommandOrControl+A',
			click: onClickSelectAll && onClickSelectAll.bind(null, webContents),
		},
	],
});

const createViewMenuTemplate = ({
	webContents,
	hasTrayIcon = true,
	isFullScreen = false,
	isMenuBarVisible = true,
	isSideBarVisible = true,
	onClickReload,
	onClickReloadIgnoringCache,
	onClickClearCertificates,
	onClickOpenDevToolsForServer,
	onClickGoBack,
	onClickGoForward,
	onToggleTrayIcon,
	onToggleFullScreen,
	onToggleMenuBar,
	onToggleSideBar,
	onClickResetZoom,
	onClickZoomIn,
	onClickZoomOut,
}) => ({
	label: t('menus.viewMenu'),
	submenu: [
		{
			label: t('menus.reload'),
			accelerator: 'CommandOrControl+R',
			click: onClickReload && onClickReload.bind(null, webContents),
		},
		{
			label: t('menus.reloadIgnoringCache'),
			click: onClickReloadIgnoringCache && onClickReloadIgnoringCache.bind(null, webContents),
		},
		{
			label: t('menus.clearTrustedCertificates'),
			click: onClickClearCertificates && onClickClearCertificates.bind(null, webContents),
		},
		{
			label: t('menus.openDevTools'),
			accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
			click: onClickOpenDevToolsForServer && onClickOpenDevToolsForServer.bind(null, webContents),
		},
		{
			type: 'separator',
		},
		{
			label: t('menus.back'),
			accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
			click: onClickGoBack && onClickGoBack.bind(null, webContents),
		},
		{
			label: t('menus.forward'),
			accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
			click: onClickGoForward && onClickGoForward.bind(null, webContents),
		},
		{
			type: 'separator',
		},
		{
			label: t('menus.showTrayIcon'),
			type: 'checkbox',
			checked: hasTrayIcon,
			click: onToggleTrayIcon && (({ checked }) => onToggleTrayIcon(checked)),
		},
		...(process.platform === 'darwin' ? [
			{
				label: t('menus.showFullScreen'),
				type: 'checkbox',
				checked: isFullScreen,
				accelerator: 'Control+Command+F',
				click: onToggleFullScreen && (({ checked }) => onToggleFullScreen(checked)),
			},
		] : [
			{
				label: t('menus.showMenuBar'),
				type: 'checkbox',
				checked: isMenuBarVisible,
				click: onToggleMenuBar && (({ checked }) => onToggleMenuBar(checked)),
			},
		]),
		{
			label: t('menus.showServerList'),
			type: 'checkbox',
			checked: isSideBarVisible,
			click: onToggleSideBar && (({ checked }) => onToggleSideBar(checked)),
		},
		{
			type: 'separator',
		},
		{
			label: t('menus.resetZoom'),
			accelerator: 'CommandOrControl+0',
			click: onClickResetZoom && onClickResetZoom.bind(null),
		},
		{
			label: t('menus.zoomIn'),
			accelerator: 'CommandOrControl+Plus',
			click: onClickZoomIn && onClickZoomIn.bind(null),
		},
		{
			label: t('menus.zoomOut'),
			accelerator: 'CommandOrControl+-',
			click: onClickZoomOut && onClickZoomOut.bind(null),
		},
	],
});

const createWindowMenuTemplate = ({
	servers = [],
	activeServerURL = null,
	showWindowOnUnreadChanged = false,
	onClickAddNewServer,
	onClickSelectServer,
	onClickReloadApp,
	onToggleAppDevTools,
	onToggleShowWindowOnUnreadChanged,
}) => ({
	label: t('menus.windowMenu'),
	id: 'window',
	role: 'window',
	submenu: [
		...(process.platform === 'darwin' ? [
			{
				label: t('menus.addNewServer'),
				accelerator: 'Command+N',
				click: onClickAddNewServer && onClickAddNewServer.bind(null),
			},
			{
				type: 'separator',
			},
		] : []),
		...servers.map((server, i) => ({
			label: server.title.replace(/&/g, '&&'),
			type: activeServerURL ? 'radio' : 'normal',
			checked: activeServerURL === server.url,
			accelerator: `CommandOrControl+${ i + 1 }`,
			id: server.url,
			click: onClickSelectServer && onClickSelectServer.bind(null, server),
		})),
		{
			type: 'separator',
		},
		{
			label: t('menus.reload'),
			accelerator: 'CommandOrControl+Shift+R',
			click: onClickReloadApp && onClickReloadApp.bind(null),
		},
		{
			label: t('menus.toggleDevTools'),
			click: onToggleAppDevTools && onToggleAppDevTools.bind(null),
		},
		{
			type: 'separator',
		},
		{
			label: t('menus.showOnUnreadMessage'),
			type: 'checkbox',
			checked: showWindowOnUnreadChanged,
			click: onToggleShowWindowOnUnreadChanged && (({ checked }) => onToggleShowWindowOnUnreadChanged(checked)),
		},
		{
			type: 'separator',
		},
		{
			label: t('menus.minimize'),
			accelerator: 'CommandOrControl+M',
			role: 'minimize',
		},
		{
			label: t('menus.close'),
			accelerator: 'CommandOrControl+W',
			role: 'close',
		},
	],
});

const createHelpMenuTemplate = ({
	appName,
	onClickOpenURL,
	onClickResetAppData,
	onClickShowAbout,
}) => ({
	label: t('menus.helpMenu'),
	role: 'help',
	submenu: [
		{
			label: t('menus.documentation'),
			click: onClickOpenURL && onClickOpenURL.bind(null, 'https://rocket.chat/docs'),
		},
		{
			type: 'separator',
		},
		{
			label: t('menus.reportIssue'),
			click: onClickOpenURL && onClickOpenURL.bind(null, 'https://github.com/RocketChat/Rocket.Chat.Electron/issues/new'),
		},
		{
			label: t('menus.resetAppData'),
			click: onClickResetAppData && onClickResetAppData.bind(null),
		},
		{
			type: 'separator',
		},
		{
			label: t('menus.learnMore'),
			click: onClickOpenURL && onClickOpenURL.bind(null, 'https://rocket.chat'),
		},
		...(process.platform !== 'darwin' ? [
			{
				id: 'about',
				label: t('menus.about', { appName }),
				click: onClickShowAbout && onClickShowAbout.bind(null),
			},
		] : []),
	],
});

const createTemplate = (props) => ([
	createAppMenuTemplate(props),
	createEditMenuTemplate(props),
	createViewMenuTemplate(props),
	createWindowMenuTemplate(props),
	createHelpMenuTemplate(props),
]);

const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	const template = createTemplate(props);
	menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);

	if (process.platform !== 'darwin') {
		const { isMenuBarVisible = false } = props;
		const mainWindow = getCurrentWindow();
		mainWindow.setAutoHideMenuBar(!isMenuBarVisible);
		mainWindow.setMenuBarVisibility(isMenuBarVisible);
	}
};

export function MenuBar() {
	const appName = useAppName();
	const servers = useServers();
	const activeServer = useActiveServer();
	const activeServerURL = useMemo(() => (activeServer || {}).url, [servers]);
	const {
		showWindowOnUnreadChanged,
		hasTrayIcon,
		isMenuBarVisible,
		isSideBarVisible,
	} = usePreferences();
	const { isFullScreen } = useMainWindowState();
	const focusedWebContents = useFocusedWebContents();
	const setOpenModal = useSetOpenModal();
	const quitApp = useQuitApp();
	const mainWindow = useMainWindow();
	const clearCertificates = useClearCertificates();
	const activateMainWindow = useActivateMainWindow();
	const { setActiveServerURL } = useServersActions();
	const setOpenView = useSetOpenView();
	const mergePreferences = useMergePreferences();

	useEffect(() => {
		setProps({
			servers,
			activeServerURL,
			hasTrayIcon,
			isFullScreen,
			isMenuBarVisible,
			isSideBarVisible,
			showWindowOnUnreadChanged,
			appName,
			webContents: focusedWebContents,
			onClickShowAbout: () => {
				setOpenModal('about');
			},
			onClickQuit: () => {
				quitApp();
			},
			onClickUndo: (webContents) => {
				webContents.undo();
			},
			onClickRedo: (webContents) => {
				webContents.redo();
			},
			onClickCut: (webContents) => {
				webContents.cut();
			},
			onClickCopy: (webContents) => {
				webContents.copy();
			},
			onClickPaste: (webContents) => {
				webContents.paste();
			},
			onClickSelectAll: (webContents) => {
				webContents.selectAll();
			},
			onClickReload: (webContents) => {
				if (webContents === mainWindow.webContents) {
					return;
				}
				webContents.reload();
			},
			onClickReloadIgnoringCache: (webContents) => {
				if (webContents === mainWindow.webContents) {
					return;
				}
				webContents.reloadIgnoringCache();
			},
			onClickClearCertificates: () => {
				clearCertificates();
			},
			onClickOpenDevToolsForServer: (webContents) => {
				if (webContents === mainWindow.webContents) {
					return;
				}
				webContents.openDevTools();
			},
			onClickGoBack: (webContents) => {
				if (webContents === mainWindow.webContents) {
					return;
				}
				webContents.goBack();
			},
			onClickGoForward: (webContents) => {
				if (webContents === mainWindow.webContents) {
					return;
				}
				webContents.goForward();
			},
			onToggleFullScreen: (isEnabled) => {
				mainWindow.setFullScreen(isEnabled);
			},
			onClickResetZoom: () => {
				mainWindow.webContents.setZoomLevel(0);
			},
			onClickZoomIn: () => {
				const newZoomLevel = Math.min(mainWindow.webContents.getZoomLevel() + 1, 9);
				mainWindow.webContents.setZoomLevel(newZoomLevel);
			},
			onClickZoomOut: () => {
				const newZoomLevel = Math.max(mainWindow.webContents.getZoomLevel() - 1, -9);
				mainWindow.webContents.setZoomLevel(newZoomLevel);
			},
			onClickReloadApp: () => {
				mainWindow.webContents.reloadIgnoringCache();
			},
			onToggleAppDevTools: () => {
				mainWindow.webContents.toggleDevTools();
			},
			onClickOpenURL: (url) => {
				shell.openExternal(url);
			},
			onClickResetAppData: async () => {
				const { response } = await showMessageBox({
					type: 'question',
					buttons: [
						t('dialog.resetAppData.yes'),
						t('dialog.resetAppData.cancel'),
					],
					defaultId: 1,
					title: t('dialog.resetAppData.title'),
					message: t('dialog.resetAppData.message'),
				});

				const mustResetAppData = response === 0;

				if (!mustResetAppData) {
					return;
				}

				requestAppDataReset();
			},
			onClickAddNewServer: () => {
				activateMainWindow();
				setActiveServerURL(null);
				setOpenView('landing');
			},
			onToggleTrayIcon: (isEnabled) => {
				mergePreferences({ hasTrayIcon: isEnabled });
			},
			onToggleMenuBar: (isEnabled) => {
				mergePreferences({ isMenuBarVisible: isEnabled });
			},
			onToggleSideBar: (isEnabled) => {
				mergePreferences({ isSideBarVisible: isEnabled });
			},
			onClickSelectServer: ({ url }) => {
				activateMainWindow();
				setActiveServerURL(url);
				setOpenView('webViews');
			},
			onToggleShowWindowOnUnreadChanged: (isEnabled) => {
				mergePreferences({ showWindowOnUnreadChanged: isEnabled });
			},
		});
	});

	return null;
}
