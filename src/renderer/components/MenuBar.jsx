import { useEffect } from 'react';
import menus from '../menus';


export function MenuBar(props) {
	useEffect(() => {
		menus.setProps(props);
	});

	return null;
}
