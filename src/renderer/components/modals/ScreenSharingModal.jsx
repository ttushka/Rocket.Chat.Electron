import { desktopCapturer } from 'electron';
import React, { useEffect } from 'react';
import { t } from 'i18next';
import { reportError } from '../../../errorHandling';


let props = {
	visible: false,
};
let dialog;
let template;
let updatePreviewsTimer;

const handleBackdropClick = (event) => {
	const { clientLeft, clientTop, clientWidth, clientHeight } = dialog;
	const { left, top } = dialog.getBoundingClientRect();
	const { clientX, clientY } = event;

	const minX = left + clientLeft;
	const minY = top + clientTop;
	if ((clientX < minX || clientX >= minX + clientWidth) || (clientY < minY || clientY >= minY + clientHeight)) {
		const { onDismiss } = props;
		onDismiss && onDismiss();
	}
};

const getScreenSharingSources = () => new Promise((resolve, reject) => {
	desktopCapturer.getSources({ types: ['window', 'screen'] }, (error, sources) => {
		if (error) {
			reject(error);
			return;
		}

		resolve(sources);
	});
});

const handleScreenSharingPreviewClick = (id) => {
	const { onSelectScreenSharingSource } = props;
	onSelectScreenSharingSource && onSelectScreenSharingSource(id);
};

const updateScreenSharingPreviews = async () => {
	try {
		const sources = await getScreenSharingSources();

		document.querySelector('.screenshare-sources').innerHTML = '';

		sources.forEach(({ id, name, thumbnail }) => {
			const sourceView = document.importNode(template.content, true);

			const imgElement = sourceView.querySelector('.screenshare-source-thumbnail img');
			imgElement.setAttribute('alt', name);
			imgElement.setAttribute('src', thumbnail.toDataURL());
			sourceView.querySelector('.screenshare-source-name').innerText = name;

			sourceView.querySelector('.screenshare-source')
				.addEventListener('click', handleScreenSharingPreviewClick.bind(null, id), false);

			document.querySelector('.screenshare-sources').appendChild(sourceView);
		});
	} catch (error) {
		reportError(error);
	}
};

const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	if (!dialog) {
		dialog = document.querySelector('.screen-sharing-modal');
		template = dialog.querySelector('.screenshare-source-template');
		dialog.addEventListener('click', handleBackdropClick, false);
	}

	const {
		visible,
	} = props;

	if (visible && !dialog.open) {
		dialog.showModal();
		updatePreviewsTimer = setInterval(updateScreenSharingPreviews, 1000);
	}

	if (!visible && dialog.open) {
		dialog.close();
		clearInterval(updatePreviewsTimer);
	}

	dialog.querySelector('.screenshare-title').innerText = t('dialog.screenshare.announcement');
};

const Markup = React.memo(() =>
	<dialog className='screen-sharing-modal'>
		<template className='screenshare-source-template'>
			<div className='screenshare-source'>
				<div className='screenshare-source-thumbnail'>
					<img src='' alt='' />
				</div>
				<div className='screenshare-source-name'></div>
			</div>
		</template>
		<h1 className='screenshare-title'>Select a screen to share</h1>
		<div className='screenshare-sources'></div>
	</dialog>
);
Markup.displayName = 'Markup';

export function ScreenSharingModal(props) {
	useEffect(() => {
		setProps(props);
	});

	return <Markup />;
}
