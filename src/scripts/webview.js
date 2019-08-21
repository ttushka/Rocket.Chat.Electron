import { remote } from 'electron';
import { EventEmitter } from 'events';
import screenSharingModal from './screenSharingModal';
import { spellCheckWords, getSpellCheckingDictionaries, getEnabledSpellCheckingDictionaries, getSpellCheckingCorrections } from './spellChecking';
import contextMenu from './contextMenu';
import menus from './menus';
import ipc from '../ipc';


const { getCurrentWebContents } = remote;

let props = {
	servers: [],
};
let servers = [];

class WebView extends EventEmitter {
	constructor() {
		super();
		this.webviewParentElement = document.body;
	}

	add(host) {
		let webviewObj = this.getByUrl(host.url);
		if (webviewObj) {
			return;
		}

		webviewObj = document.createElement('webview');
		webviewObj.classList.add('webview');
		webviewObj.setAttribute('server', host.url);
		webviewObj.setAttribute('preload', '../preload.js');
		webviewObj.setAttribute('disablewebsecurity', 'disablewebsecurity');

		webviewObj.addEventListener('did-navigate-in-page', (lastPath) => {
			if ((lastPath.url).includes(host.url)) {
				const { onNavigate } = props;
				onNavigate && onNavigate(host.url, lastPath.url);
			}
		});

		webviewObj.addEventListener('console-message', (e) => {
			console.log('webview:', e.message);
		});

		webviewObj.addEventListener('ipc-message', (event) => {
			this.emit(`ipc-message-${ event.channel }`, host.url, event.args);

			switch (event.channel) {
				case 'get-sourceId': {
					screenSharingModal.setProps({
						visible: true,
					});

					const disconnect = ipc.connect('screenshare-result', (event, id) => {
						webviewObj.executeJavaScript(`window.parent.postMessage({ sourceId: '${ id }' }, '*');`);
						disconnect();
					});
					break;
				}

				case 'reload-server': {
					const webviewObj = this.getByUrl(host.url);
					const server = webviewObj.getAttribute('server');
					webviewObj.loadURL(server);
					break;
				}
				case 'spell-checker/check': {
					const [id, words] = event.args;
					const callback = (mispeltWords) => {
						webviewObj.send('spell-checker/check/result', id, mispeltWords);
					};
					spellCheckWords(words, callback);
					break;
				}
			}
		});

		webviewObj.addEventListener('dom-ready', () => {
			webviewObj.classList.add('ready');
			this.emit('dom-ready', webviewObj, host.url);
		});

		webviewObj.addEventListener('did-fail-load', (e) => {
			if (e.isMainFrame) {
				webviewObj.loadURL(`file://${ __dirname }/loading-error.html`);
			}
		});

		webviewObj.addEventListener('did-get-response-details', (e) => {
			if (e.resourceType === 'mainFrame' && e.httpResponseCode >= 500) {
				webviewObj.loadURL(`file://${ __dirname }/loading-error.html`);
			}
		});

		webviewObj.addEventListener('context-menu', (event) => {
			event.preventDefault();
			const webContents = webviewObj.getWebContents();
			contextMenu.setProps({
				webContents,
				...event.params,
				spellCheckingCorrections: getSpellCheckingCorrections(event.params.selectionText),
				spellCheckingDictionaries: getSpellCheckingDictionaries().map((name) => ({
					name,
					enabled: getEnabledSpellCheckingDictionaries().includes(name),
				})),
			});
			contextMenu.trigger();
		});

		webviewObj.addEventListener('focus', () => {
			menus.setProps({
				webContents: webviewObj.getWebContents(),
			});
		});

		webviewObj.addEventListener('blur', () => {
			menus.setProps({
				webContents: getCurrentWebContents(),
			});
		});

		this.webviewParentElement.appendChild(webviewObj);

		webviewObj.src = host.lastPath || host.url;
	}

	remove(hostUrl) {
		const el = this.getByUrl(hostUrl);
		if (el) {
			el.remove();
		}
	}

	getByUrl(hostUrl) {
		return this.webviewParentElement.querySelector(`webview[server="${ hostUrl }"]`);
	}

	getActive() {
		return document.querySelector('webview.active');
	}

	isActive(hostUrl) {
		return !!this.webviewParentElement.querySelector(`webview.active[server="${ hostUrl }"]`);
	}

	deactiveAll() {
		let item;
		while (!(item = this.getActive()) === false) {
			item.classList.remove('active');
		}
	}

	setActive(hostUrl) {
		if (this.isActive(hostUrl)) {
			return;
		}

		this.deactiveAll();
		const item = this.getByUrl(hostUrl);
		if (item) {
			item.classList.add('active');
		}
		this.focusActive();
	}

	focusActive() {
		const active = this.getActive();
		if (active) {
			active.focus();
			return true;
		}
		return false;
	}

	goBack() {
		this.getActive().goBack();
	}

	goForward() {
		this.getActive().goForward();
	}

	setSidebarPaddingEnabled(enabled) {
		if (process.platform !== 'darwin') {
			return;
		}

		Array.from(document.querySelectorAll('webview.ready'))
			.filter((webviewObj) => webviewObj.insertCSS)
			.forEach((webviewObj) => webviewObj.insertCSS(`
				.sidebar {
					padding-top: ${ enabled ? '10px' : '0' };
					transition: margin .5s ease-in-out;
				}
			`));
	}
}

const instance = new WebView();

const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	const {
		servers: propServers,
		activeServerURL,
	} = props;

	const addedServers = propServers.filter(({ url }) => !servers.some((server) => server.url === url));
	const removedServers = servers.filter(({ url }) => !propServers.some((server) => server.url === url));
	if (addedServers.length || removedServers.length) {
		servers = servers.filter((server) => !removedServers.includes(server)).concat(addedServers);
	}

	addedServers.forEach((server) => {
		instance.add(server);
	});

	removedServers.forEach((server) => {
		instance.remove(server.url);
	});

	instance.setActive(activeServerURL);
};

export default Object.assign(instance, {
	setProps,
});
