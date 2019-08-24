import React, { useEffect } from 'react';
import sideBar from '../sideBar';


const Markup = React.memo(() =>
	<div className='sidebar sidebar--hidden'>
		<div className='sidebar__inner'>
			<ol className='sidebar__list sidebar__server-list'>
			</ol>
			<button className='sidebar__action sidebar__add-server' data-tooltip='Add server'>
				<span className='sidebar__action-label'>+</span>
			</button>
		</div>
	</div>
);
Markup.displayName = 'Markup';

export function SideBar(props) {
	useEffect(() => {
		sideBar.setProps(props);
	});

	return <Markup />;
}
