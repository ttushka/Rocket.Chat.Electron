import { useEffect } from 'react';
import dock from '../dock';


export function Dock(props) {
	useEffect(() => {
		dock.setProps(props);
	});

	return null;
}
