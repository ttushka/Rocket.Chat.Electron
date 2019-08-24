import React, { useEffect } from 'react';
import aboutModal from '../aboutModal';


const Markup = React.memo(() =>
	<dialog className='about-modal'>
		<section className='app-info'>
			<div className='app-logo'>
				<img src='./images/logo.svg' />
			</div>
			<div className='app-version'>
				Version <span className='version'>%s</span>
			</div>
		</section>

		<section className='updates hidden'>
			<button className='check-for-updates button primary'>
				Check for Updates
			</button>

			<div className='checking-for-updates hidden'>
				<span className='dot'></span>
				<span className='dot'></span>
				<span className='dot'></span>
				<span className='message'></span>
			</div>

			<label className='check-for-updates-on-start__label'>
				<input className='check-for-updates-on-start' type='checkbox' defaultChecked /> <span>Check for Updates on Start</span>
			</label>
		</section>

		<div className='copyright'></div>
	</dialog>
);
Markup.displayName = 'Markup';

export function AboutModal(props) {
	useEffect(() => {
		aboutModal.setProps(props);
	});

	return <Markup />;
}
