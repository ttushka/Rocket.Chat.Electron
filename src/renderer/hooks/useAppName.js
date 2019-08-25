import { remote } from 'electron';


const { app } = remote;
let appName;

export const useAppName = () => {
	if (!appName) {
		appName = app.getName();
	}

	return appName;
};
