import querystring from 'querystring';
import url from 'url';
import { remote, ipcRenderer } from 'electron';


const normalizeUrl = (hostUrl) => {
	if (!/^https?:\/\//.test(hostUrl)) {
		return `https://${ hostUrl }`;
	}

	return hostUrl;
};

const processAuth = ({ host, token, userId }) => {
	const hostUrl = normalizeUrl(host);
	ipcRenderer.emit('add-host', null, hostUrl, { token, userId });
};

const processRoom = async ({ host, rid, path }) => {
	const hostUrl = normalizeUrl(host);
	ipcRenderer.emit('add-host', null, hostUrl);
	ipcRenderer.emit('open-room', null, hostUrl, { rid, path });
};

export const processDeepLink = (link) => {
	const { protocol, hostname:	action, query } = url.parse(link);

	if (protocol !== 'rocketchat:') {
		return;
	}

	switch (action) {
		case 'auth': {
			processAuth(querystring.parse(query));
			break;
		}
		case 'room': {
			processRoom(querystring.parse(query));
			break;
		}
	}
};

export const setupDeepLinks = () => {
	remote.app.on('open-url', (event, url) => {
		processDeepLink(url);
	});

	remote.app.on('second-instance', (event, argv) => {
		argv.slice(2).forEach(processDeepLink);
	});

	setImmediate(() => {
		remote.process.argv.slice(2).forEach(processDeepLink);
	});
};
