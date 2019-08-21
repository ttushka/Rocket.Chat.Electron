import { remote } from 'electron';
import {
	spellCheckWords,
} from './spellChecking';
import ipc from '../ipc';


const { app } = remote;

const getPathFromApp = (path) => `${ app.getAppPath() }/app/${ path }`;

let props = {
	servers: [],
	activeServerURL: null,
};
let servers = [];

const setProps = (partialProps) => {
	const prevProps = props;
	props = {
		...props,
		...partialProps,
	};

	const {
		servers: propServers,
		activeServerURL,
		hasSideBarPadding,
	} = props;

	const addedServers = propServers.filter(({ url }) => !servers.some((server) => server.url === url));
	const removedServers = servers.filter(({ url }) => !propServers.some((server) => server.url === url));
	if (addedServers.length || removedServers.length) {
		servers = servers.filter((server) => !removedServers.includes(server)).concat(addedServers);
	}

	Array.from(document.querySelectorAll('webview'))
		.filter((webviewObj) => removedServers.some((server) => server.url === webviewObj.dataset.server))
		.forEach((webviewObj) => {
			webviewObj.remove();
		});

	servers.forEach((server) => {
		const webviewObj = document.querySelector(`webview[data-server="${ server.url }"]`)
			|| document.createElement('webview');

		if (webviewObj.parentElement) {
			return;
		}

		webviewObj.setAttribute('preload', `file://${ getPathFromApp('./preload.js') }`);
		webviewObj.toggleAttribute('disablewebsecurity', true);
		webviewObj.classList.add('webview');
		webviewObj.dataset.server = server.url;

		webviewObj.addEventListener('dom-ready', () => {
			webviewObj.classList.add('ready');
		});

		webviewObj.addEventListener('did-navigate-in-page', (lastPath) => {
			if ((lastPath.url).includes(server.url)) {
				const { onNavigate } = props;
				onNavigate && onNavigate(server.url, lastPath.url);
			}
		});

		webviewObj.addEventListener('console-message', ({ level, line, message, sourceId }) => {
			const log = {
				[-1]: console.debug,
				0: console.log,
				1: console.warn,
				2: console.error,
			}[level];
			log(`${ server.url }\n${ message }\n${ sourceId } : ${ line }`);
		});

		webviewObj.addEventListener('ipc-message', (event) => {
			const { channel, args } = event;

			switch (channel) {
				case 'reload-server': {
					webviewObj.loadURL(server.url);
					break;
				}

				case 'spell-checker/check': {
					const [id, words] = args;
					const callback = (mispeltWords) => {
						webviewObj.send('spell-checker/check/result', id, mispeltWords);
					};
					spellCheckWords(words, callback);
					break;
				}

				case 'focus': {
					const { onRequestFocus } = props;
					onRequestFocus && onRequestFocus(server.url);
					break;
				}

				case 'get-sourceId': {
					const { onRequestScreenSharing } = props;
					onRequestScreenSharing && onRequestScreenSharing(server.url);
					break;
				}

				case 'sidebar-style': {
					const [style] = args;
					const { onSideBarStyleChange } = props;
					onSideBarStyleChange && onSideBarStyleChange(server.url, style);
					break;
				}

				case 'title-changed': {
					const [title] = args;
					const { onTitleChange } = props;
					onTitleChange && onTitleChange(server.url, title);
					break;
				}

				case 'unread-changed': {
					const [badge] = args;
					const { onBadgeChange } = props;
					onBadgeChange && onBadgeChange(server.url, badge);
					break;
				}
			}
		});

		webviewObj.addEventListener('did-fail-load', (e) => {
			if (e.isMainFrame) {
				webviewObj.loadURL(`file://${ getPathFromApp('loading-error.html') }`);
			}
		});

		webviewObj.addEventListener('did-get-response-details', (e) => {
			if (e.resourceType === 'mainFrame' && e.httpResponseCode >= 500) {
				webviewObj.loadURL(`file://${ getPathFromApp('loading-error.html') }`);
			}
		});

		webviewObj.addEventListener('context-menu', (event) => {
			event.preventDefault();
			const { onContextMenu } = props;
			onContextMenu && onContextMenu(server.url, webviewObj.getWebContents(), event.params);
		});

		webviewObj.addEventListener('focus', () => {
			const { onFocus } = props;
			onFocus && onFocus(server.url, webviewObj.getWebContents());
		});

		webviewObj.addEventListener('blur', () => {
			const { onBlur } = props;
			onBlur && onBlur(server.url, webviewObj.getWebContents());
		});

		const disconnect = ipc.connect('screenshare-result', (event, id) => {
			webviewObj.executeJavaScript(`window.parent.postMessage({ sourceId: '${ id }' }, '*');`);
			disconnect();
		});

		document.body.appendChild(webviewObj);

		webviewObj.src = server.lastPath || server.url;
	});

	Array.from(document.querySelectorAll('webview'))
		.forEach((webviewObj) => {
			webviewObj.classList.toggle('active', webviewObj.dataset.server === activeServerURL);
			if (webviewObj.dataset.server === activeServerURL && prevProps.activeServerURL !== activeServerURL) {
				webviewObj.focus();
			}
		});

	Array.from(document.querySelectorAll('webview.ready'))
		.filter((webviewObj) => webviewObj.insertCSS)
		.forEach((webviewObj) => {
			if (process.platform !== 'darwin') {
				return;
			}

			webviewObj.insertCSS(`
				.sidebar {
					padding-top: ${ hasSideBarPadding ? '10px' : '0' };
					transition: margin .5s ease-in-out;
				}
			`);
		});
};

const reload = (serverURL) => {
	const webviewObj = document.querySelector(`webview[data-server="${ serverURL }"]`);
	webviewObj && webviewObj.reload();
};

const openDevTools = (serverURL) => {
	const webviewObj = document.querySelector(`webview[data-server="${ serverURL }"]`);
	webviewObj && webviewObj.openDevTools();
};

export default {
	setProps,
	reload,
	openDevTools,
};
