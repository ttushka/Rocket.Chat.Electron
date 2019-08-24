import React, { useEffect } from 'react';
import screenSharingModal from '../screenSharingModal';


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
		screenSharingModal.setProps(props);
	});

	return <Markup />;
}
