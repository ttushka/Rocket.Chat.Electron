import React, { createContext, useContext, useEffect } from 'react';
import { EventEmitter } from 'events';
import { useEventEmitter } from '../../hooks/useEventEmitter';
import { useEventListener } from '../../hooks/useEventListener';
import { remote } from 'electron';
import { parse as parseQueryString } from 'querystring';
import { parse as parseURL } from 'url';


const { app, process: { argv } } = remote;

const normalizeURL = (serverURL) => {
	if (!/^https?:\/\//.test(serverURL)) {
		return `https://${ serverURL }`;
	}

	return serverURL;
};

const DeepLinkingEventEmitterContext = createContext(new EventEmitter());

export const useDeepLinkingEvent = (eventName, listener) => {
	const eventEmitter = useContext(DeepLinkingEventEmitterContext);
	useEventListener(eventEmitter, eventName, listener);
};

export function DeepLinkingHandler({ children }) {
	const eventEmitter = useEventEmitter();

	const processAuth = ({ host, token, userId }) => {
		const serverURL = normalizeURL(host);
		eventEmitter.emit('add-server', serverURL, { token, userId });
	};

	const processRoom = ({ host, rid, path }) => {
		const serverURL = normalizeURL(host);
		eventEmitter.emit('open-room', serverURL, { rid, path });
	};

	const processDeepLink = (link) => {
		const { protocol, hostname:	action, query } = parseURL(link);

		if (protocol !== 'rocketchat:') {
			return;
		}

		switch (action) {
			case 'auth': {
				processAuth(parseQueryString(query));
				break;
			}
			case 'room': {
				processRoom(parseQueryString(query));
				break;
			}
		}
	};

	const handleAppOpenURL = (event, url) => {
		processDeepLink(url);
	};

	const handleAppSecondInstance = (event, argv) => {
		const args = argv.slice(2);
		args.forEach(processDeepLink);
	};

	useEventListener(app, 'open-url', handleAppOpenURL);
	useEventListener(app, 'second-instance', handleAppSecondInstance);

	useEffect(() => {
		const args = argv.slice(2);
		args.forEach(processDeepLink);
	}, []);

	return <DeepLinkingEventEmitterContext.Provider value={eventEmitter}>
		{children}
	</DeepLinkingEventEmitterContext.Provider>;
}
