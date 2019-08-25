import { ipcRenderer } from 'electron';


let style = null;

const sendStyle = (newStyle) => {
	if (JSON.stringify(style) === JSON.stringify(newStyle)) {
		return;
	}

	ipcRenderer.sendToHost('sidebar-style', newStyle);
	style = newStyle;
};

function getStylesFromSidebar(sidebar) {
	const { color, background } = window.getComputedStyle(sidebar);
	const sidebarItem = sidebar.querySelector('.sidebar-item');
	const itemColor = sidebarItem && window.getComputedStyle(sidebarItem).color;
	sendStyle({ color: itemColor || color, background });
}

function getStylesFromPage(fullpage) {
	const { color, background } = window.getComputedStyle(fullpage);
	sendStyle({ color, background });
}

function createStylesObserver(element, getStylesFrom) {
	const observer = new MutationObserver(() => {
		getStylesFrom(element);
	});

	observer.observe(element, { attributes: true });
	getStylesFrom(element);

	return observer;
}

let observer;

function requestSidebarStyle() {
	const sidebar = document.querySelector('.sidebar');
	if (sidebar) {
		observer && observer.disconnect();
		observer = createStylesObserver(sidebar, getStylesFromSidebar);
		return;
	}

	const fullpage = document.querySelector('.full-page');
	if (fullpage) {
		observer = createStylesObserver(fullpage, getStylesFromPage);
		setTimeout(requestSidebarStyle, 1000);
		return;
	}

	requestAnimationFrame(requestSidebarStyle);
}

export default () => {
	window.addEventListener('load', requestSidebarStyle);
};
