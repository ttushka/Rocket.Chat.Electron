import { remote } from 'electron';


const { app } = remote;
let appVersion;

export const useAppVersion = () => {
	if (!appVersion) {
		appVersion = app.getVersion();
	}

	return appVersion;
};
