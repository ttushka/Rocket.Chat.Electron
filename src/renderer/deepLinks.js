import { remote } from 'electron';
import querystring from 'querystring';
import url from 'url';


const { app } = remote;

let props = {
	onAddHost: null,
	onOpenRoom: null,
};

const normalizeUrl = (hostUrl) => {
	if (!/^https?:\/\//.test(hostUrl)) {
		return `https://${ hostUrl }`;
	}

	return hostUrl;
};

const processAuth = ({ host, token, userId }) => {
	const hostUrl = normalizeUrl(host);
	const { onAddHost } = props;

	onAddHost && onAddHost(hostUrl, { token, userId });
};

const processRoom = async ({ host, rid, path }) => {
	const hostUrl = normalizeUrl(host);
	const { onAddHost, onOpenRoom } = props;
	onAddHost && onAddHost(hostUrl);
	onOpenRoom && onOpenRoom(hostUrl, { rid, path });
};

const processDeepLink = (link) => {
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

const setupDeepLinks = () => {
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

let mounted = false;
const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	if (mounted) {
		return;
	}

	setupDeepLinks();
	mounted = true;
};

export default {
	setProps,
};
