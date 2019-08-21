let props = {
	onUpdate: null,
};

let preferences = {};

export const setPreferences = (partialPreferences) => {
	preferences = {
		...preferences,
		...partialPreferences,
	};

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

	const { onUpdate } = props;
	onUpdate && onUpdate();
};

export const getPreferences = () => preferences;

let mounted = false;
const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	if (mounted) {
		return;
	}

	preferences = {
		showWindowOnUnreadChanged: localStorage.getItem('showWindowOnUnreadChanged') === 'true',
		hasTrayIcon: localStorage.getItem('hideTray')
			? localStorage.getItem('hideTray') !== 'true'
			: process.platform === 'darwin',
		isMenuBarVisible: localStorage.getItem('autohideMenu') !== 'true',
		isSideBarVisible: localStorage.getItem('sidebar-closed') !== 'true',
	};
	mounted = true;
};

export default {
	setProps,
};
