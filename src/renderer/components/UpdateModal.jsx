import React, { useEffect } from 'react';
import updateModal from '../updateModal';


const Markup = React.memo(() =>
	<dialog className='update-modal'>
		<div className='update-content'>
			<h1 className='update-title'>New Update is Available</h1>
			<p className='update-message'>A new version of the Rocket.Chat Desktop App is available!</p>

			<div className='update-info'>
				<div className='app-version current-version'>
					<div className='app-version-label'>Current Version:</div>
					<div className='app-version-value'>a.b.c</div>
				</div>
				<div className='update-arrow'>&rarr;</div>
				<div className='app-version new-version'>
					<div className='app-version-label'>New Version:</div>
					<div className='app-version-value'>x.y.z</div>
				</div>
			</div>
		</div>

		<div className='update-actions'>
			<button className='update-skip-action button secondary'>Skip This Version</button>
			<button className='update-remind-action button secondary'>Remind Me Later</button>
			<button className='update-install-action button primary'>Install Update</button>
		</div>
	</dialog>
);
Markup.displayName = 'Markup';

export function UpdateModal(props) {
	useEffect(() => {
		updateModal.setProps(props);
	});

	return <Markup />;
}
