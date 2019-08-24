import React, { createContext, useContext, useEffect, useState } from 'react';
import { reportError } from '../../../errorHandling';


const initialPreferences = {
	showWindowOnUnreadChanged: false,
	hasTrayIcon: process.platform === 'darwin',
	isMenuBarVisible: true,
	isSideBarVisible: true,
};

const loadPreferences = async () => {
	let preferences = initialPreferences;

	try {
		preferences = JSON.parse(localStorage.getItem('preferences'));
	} catch (error) {
		reportError(error);
	}

	return {
		...preferences,
		showWindowOnUnreadChanged: localStorage.getItem('showWindowOnUnreadChanged') === 'true',
		hasTrayIcon: localStorage.getItem('hideTray')
			? localStorage.getItem('hideTray') !== 'true'
			: process.platform === 'darwin',
		isMenuBarVisible: localStorage.getItem('autohideMenu') !== 'true',
		isSideBarVisible: localStorage.getItem('sidebar-closed') !== 'true',
	};
};

const savePreferences = async (preferences) => {
	const {
		showWindowOnUnreadChanged,
		hasTrayIcon,
		isMenuBarVisible,
		isSideBarVisible,
	} = preferences;

	localStorage.setItem('showWindowOnUnreadChanged', JSON.stringify(!!showWindowOnUnreadChanged));
	localStorage.setItem('hideTray', JSON.stringify(!hasTrayIcon));
	localStorage.setItem('autohideMenu', JSON.stringify(!isMenuBarVisible));
	localStorage.setItem('sidebar-closed', JSON.stringify(!isSideBarVisible));
	localStorage.setItem('preferences', JSON.stringify(preferences));
};

const usePreferencesPersistence = (initialPreferences) => {
	const [preferences, setPreferences] = useState(initialPreferences);

	useEffect(() => {
		savePreferences(preferences);
	}, [preferences]);

	return [preferences, setPreferences];
};

const PreferencesContext = createContext(initialPreferences);

export const useMergePreferences = () => {
	const [preferences, setPreferences] = useContext(PreferencesContext);

	const mergePreferences = (partialPreferences) => {
		setPreferences({
			...preferences,
			...partialPreferences,
		});
	};

	return mergePreferences;
};

export const usePreferences = () => {
	const [preferences] = useContext(PreferencesContext);
	return preferences;
};

export const PreferencesProvider = React.lazy(async () => {
	const loadedPreferences = await loadPreferences();

	function PreferencesProvider({ children }) {
		const contextValue = usePreferencesPersistence(loadedPreferences);

		return <PreferencesContext.Provider value={contextValue}>
			{children}
		</PreferencesContext.Provider>;
	}

	return { default: PreferencesProvider };
});
