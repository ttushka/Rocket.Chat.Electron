import { desktopCapturer, remote } from 'electron';
import url from 'url';
import { getSettings } from './rocketChat';


const { app } = remote;

const getPathFromApp = (path) => `${ app.getAppPath() }/app/${ path }`;

const JitsiMeetElectron = {
	obtainDesktopStreams(callback, errorCallback, options = {}) {
		desktopCapturer.getSources(options, (error, sources) => {
			if (error) {
				errorCallback(error);
				return;
			}

			callback(sources);
		});
	},
};

const wrapWindowOpen = (defaultWindowOpen) => (href, frameName, features) => {
	const settings = getSettings();

	if (settings && url.parse(href).host === settings.get('Jitsi_Domain')) {
		features = [
			features,
			'nodeIntegration=yes',
			`preload=${ getPathFromApp('preload.js') }`,
		].filter(Boolean).join(',');
	}

	return defaultWindowOpen.call(window, href, frameName, features);
};


const pollJitsiIframe = () => {
	const jitsiIframe = document.querySelector('iframe[id^=jitsiConference]');
	if (!jitsiIframe) {
		return;
	}

	jitsiIframe.contentWindow.JitsiMeetElectron = JitsiMeetElectron;
};


export default () => {
	window.JitsiMeetElectron = JitsiMeetElectron;
	window.open = wrapWindowOpen(window.open);

	window.addEventListener('load', () => {
		setInterval(pollJitsiIframe, 1000);
	});
};
