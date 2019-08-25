import { remote } from 'electron';
import { t } from 'i18next';
import React, { useEffect, useMemo } from 'react';
import { parse as parseURL } from 'url';
import { usePreferences } from './services/PreferencesProvider';
import { useServers, useActiveServer, useServersActions } from './services/ServersProvider';
import { useReloadWebView, useOpenDevToolsForWebView } from './views/WebViewsView';
import { useSetOpenView } from './services/OpenViewState';


const { getCurrentWindow, Menu } = remote;

const faviconCacheBustingTime = 15 * 60 * 1000;

let props = {
	visible: false,
	servers: [],
	activeServerURL: null,
	badges: {},
	styles: {},
	isShortcutsVisible: false,
};
let root;
let serverListRoot;

const renderServer = ({ url, title, order, active, hasUnreadMessages, mentionCount }) => {
	const initials = (
		title
			.replace(url, parseURL(url).hostname)
			.split(/[^A-Za-z0-9]+/g)
			.slice(0, 2)
			.map((text) => text.slice(0, 1).toUpperCase())
			.join('')
	);
	const bustingParam = Math.round(Date.now() / faviconCacheBustingTime);
	const faviconUrl = `${ url.replace(/\/$/, '') }/assets/favicon.svg?_=${ bustingParam }`;

	const handleServerClick = (serverURL) => {
		const { onClickServer } = props;
		onClickServer && onClickServer(serverURL);
	};

	const handleReloadServerClick = (serverURL) => {
		const { onClickReloadServer } = props;
		onClickReloadServer && onClickReloadServer(serverURL);
	};

	const handleRemoveServerClick = (serverURL) => {
		const { onClickRemoveServer } = props;
		onClickRemoveServer && onClickRemoveServer(serverURL);
	};

	const handleOpenDevToolsForServerClick = (serverURL) => {
		const { onClickOpenDevToolsForServer } = props;
		onClickOpenDevToolsForServer && onClickOpenDevToolsForServer(serverURL);
	};

	const handleServerContextMenu = (serverURL, event) => {
		event.preventDefault();

		const menu = Menu.buildFromTemplate([
			{
				label: t('sidebar.item.reload'),
				click: handleReloadServerClick.bind(null, serverURL),
			},
			{
				label: t('sidebar.item.remove'),
				click: handleRemoveServerClick.bind(null, serverURL),
			},
			{
				label: t('sidebar.item.openDevTools'),
				click: handleOpenDevToolsForServerClick.bind(null, serverURL),
			},
		]);
		menu.popup(getCurrentWindow());
	};

	const handleDragStart = (event) => {
		const serverRoot = event.currentTarget;
		serverRoot.classList.add('server--dragged');

		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.effectAllowed = 'move';
	};

	const handleDragEnd = (event) => {
		const serverRoot = event.currentTarget;
		serverRoot.classList.remove('server--dragged');
	};

	const handleDragEnter = (event) => {
		const draggedServerRoot = serverListRoot.querySelector('.server--dragged');
		const targetServerRoot = event.currentTarget;

		const isTargetBeforeDragged = (() => {
			for (let current = draggedServerRoot; current; current = current.previousSibling) {
				if (current === targetServerRoot) {
					return true;
				}
			}

			return false;
		})();

		if (isTargetBeforeDragged) {
			serverListRoot.insertBefore(draggedServerRoot, targetServerRoot);
		} else if (targetServerRoot !== serverListRoot.lastChild) {
			serverListRoot.insertBefore(draggedServerRoot, targetServerRoot.nextSibling);
		} else {
			serverListRoot.appendChild(draggedServerRoot);
		}
	};

	const handleDragOver = (event) => {
		event.preventDefault();
	};

	const handleDrop = (event) => {
		event.preventDefault();

		const newSorting = Array.from(serverListRoot.querySelectorAll('.server'))
			.map((serverRoot) => serverRoot.dataset.url);

		const { onSortServers } = props;
		onSortServers && onSortServers(newSorting);
	};

	const serverRoot = serverListRoot.querySelector(`.server[data-url="${ url }"]`) || document.createElement('li');
	serverRoot.setAttribute('draggable', 'true');
	serverRoot.dataset.url = url;
	serverRoot.dataset.tooltip = title;
	serverRoot.classList.add('sidebar__list-item');
	serverRoot.classList.add('server');
	serverRoot.classList.toggle('server--active', active);
	serverRoot.classList.toggle('server--unread', hasUnreadMessages);
	serverRoot.onclick = handleServerClick.bind(null, url);
	serverRoot.oncontextmenu = handleServerContextMenu.bind(null, url);
	serverRoot.ondragstart = handleDragStart.bind(null);
	serverRoot.ondragend = handleDragEnd.bind(null);
	serverRoot.ondragenter = handleDragEnter.bind(null);
	serverRoot.ondragover = handleDragOver.bind(null);
	serverRoot.ondrop = handleDrop.bind(null);

	const initialsElement = serverRoot.querySelector('.server__initials') || document.createElement('span');
	initialsElement.classList.add('server__initials');
	initialsElement.innerText = initials;

	const faviconElement = serverRoot.querySelector('.server__favicon') || document.createElement('img');
	faviconElement.setAttribute('draggable', 'false');
	faviconElement.classList.add('server__favicon');
	faviconElement.onload = () => {
		serverRoot.classList.add('server--with-favicon');
	};
	faviconElement.onerror = () => {
		serverRoot.classList.remove('server--with-favicon');
	};
	faviconElement.src = faviconUrl;

	const badgeElement = serverRoot.querySelector('.server__badge') || document.createElement('div');
	badgeElement.classList.add('server__badge');
	badgeElement.innerText = Number.isInteger(mentionCount) ? String(mentionCount) : '';

	const shortcutElement = serverRoot.querySelector('.server__shortcut') || document.createElement('div');
	shortcutElement.classList.add('server__shortcut');
	shortcutElement.innerText = `${ process.platform === 'darwin' ? '⌘' : '^' }${ order + 1 }`;

	if (!serverRoot.parentElement) {
		serverRoot.appendChild(initialsElement);
		serverRoot.appendChild(faviconElement);
		serverRoot.appendChild(badgeElement);
		serverRoot.appendChild(shortcutElement);
	}

	const shouldAppend = !serverRoot.parentElement || order !== Array.from(serverListRoot.children).indexOf(serverRoot);

	if (shouldAppend) {
		serverListRoot.appendChild(serverRoot);
	}
};

const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	const setShortcutsVisible = (isShortcutsVisible) => setProps({ isShortcutsVisible });

	if (!root) {
		root = document.querySelector('.sidebar');
		serverListRoot = root.querySelector('.sidebar__server-list');

		const handleShortcutsKeyDown = (event) => {
			const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';
			if (event.key === shortcutKey) {
				setShortcutsVisible(true);
			}
		};

		const handleShortcutsKeyUp = (event) => {
			const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';
			if (event.key === shortcutKey) {
				setShortcutsVisible(false);
			}
		};

		const handleAddServerClick = () => {
			const { onClickAddServer } = props;
			onClickAddServer && onClickAddServer();
		};

		window.addEventListener('keydown', handleShortcutsKeyDown, false);
		window.addEventListener('keyup', handleShortcutsKeyUp, false);

		root.querySelector('.sidebar__add-server').addEventListener('click', handleAddServerClick, false);
	}

	const {
		servers,
		activeServerURL,
		badges,
		styles,
		isShortcutsVisible,
		visible,
	} = props;

	root.classList.toggle('sidebar--macos', process.platform === 'darwin');
	root.classList.toggle('sidebar--hidden', !visible);

	const style = styles[activeServerURL] || {};
	root.style.setProperty('--background', style.background || '');
	root.style.setProperty('--color', style.color || '');

	serverListRoot.classList.toggle('sidebar__server-list--shortcuts', isShortcutsVisible);

	const serverURLs = servers.map(({ url }) => url);
	Array.from(serverListRoot.querySelectorAll('.server'))
		.filter((serverElement) => !serverURLs.includes(serverElement.dataset.url))
		.forEach((serverElement) => serverElement.remove());

	servers.forEach((server, order) => renderServer({
		...server,
		order,
		active: activeServerURL === server.url,
		hasUnreadMessages: !!badges[server.url],
		mentionCount: (badges[server.url] || badges[server.url] === 0) ? parseInt(badges[server.url], 10) : null,
	}));

	root.querySelector('.sidebar__add-server').dataset.tooltip = t('sidebar.addNewServer');
};

const Markup = React.memo(() =>
	<div className='sidebar sidebar--hidden'>
		<div className='sidebar__inner'>
			<ol className='sidebar__list sidebar__server-list'>
			</ol>
			<button className='sidebar__action sidebar__add-server' data-tooltip='Add server'>
				<span className='sidebar__action-label'>+</span>
			</button>
		</div>
	</div>
);
Markup.displayName = 'Markup';

export function SideBar() {
	const { isSideBarVisible } = usePreferences();
	const servers = useServers();
	const activeServer = useActiveServer();
	const activeServerURL = useMemo(() => (activeServer || {}).url, [servers]);
	const styles = useMemo(() => servers.reduce((styles, { url, style }) => ({ ...styles, [url]: style }), {}), [servers]);
	const badges = useMemo(() => servers.reduce((styles, { url, badge }) => ({ ...styles, [url]: badge }), {}), [servers]);
	const reloadWebView = useReloadWebView();
	const openDevToolsForWebView = useOpenDevToolsForWebView();
	const { removeServer, sortServers, setActiveServerURL } = useServersActions();
	const setOpenView = useSetOpenView();

	useEffect(() => {
		setProps({
			visible: isSideBarVisible,
			servers,
			activeServerURL,
			styles,
			badges,
			onClickReloadServer: (serverURL) => {
				reloadWebView(serverURL);
			},
			onClickRemoveServer:(serverURL) => {
				removeServer(serverURL);
			},
			onClickOpenDevToolsForServer: (serverURL) => {
				openDevToolsForWebView(serverURL);
			},
			onSortServers:(serverURLs) => {
				sortServers(serverURLs);
			},
			onClickAddServer: () => {
				setActiveServerURL(null);
				setOpenView('landing');
			},
			onClickServer:(serverURL) => {
				setActiveServerURL(serverURL);
				setOpenView('webViews');
			},
		});
	});

	return <Markup />;
}
