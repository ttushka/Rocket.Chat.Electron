import { useEffect } from 'react';
import touchBar from '../touchBar';


export function TouchBar(props) {
	useEffect(() => {
		touchBar.setProps(props);
	});

	return null;
}
