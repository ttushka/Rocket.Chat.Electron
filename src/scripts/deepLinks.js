import { remote } from 'electron';
import querystring from 'querystring';
import url from 'url';
import ipc from '../ipc';


const { app } = remote;

const normalizeUrl = (hostUrl) => {
	if (!/^https?:\/\//.test(hostUrl)) {
		return `https://${ hostUrl }`;
	}

	return hostUrl;
};

const processAuth = ({ host, token, userId }) => {
	const hostUrl = normalizeUrl(host);
	ipc.emit('add-host', hostUrl, { token, userId });
};

const processRoom = async ({ host, rid, path }) => {
	const hostUrl = normalizeUrl(host);
	ipc.emit('add-host', hostUrl);
	ipc.emit('open-room', hostUrl, { rid, path });
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

const handleAppOpenURL = (event, url) => {
	processDeepLink(url);
};

const handleAppSecondInstance = (event, argv) => {
	argv.slice(2).forEach(processDeepLink);
};

export const setupDeepLinks = () => {
	app.addListener('open-url', handleAppOpenURL);
	app.addListener('second-instance', handleAppSecondInstance);

	window.addEventListener('beforeunload', () => {
		app.removeListener('open-url', handleAppOpenURL);
		app.removeListener('second-instance', handleAppSecondInstance);
	}, false);

	setImmediate(() => {
		const args = remote.process.argv.slice(2);
		args.forEach(processDeepLink);
	});
};
