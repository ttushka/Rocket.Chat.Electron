import React from 'react';
import { Tooltip } from '../../styles';
import { Button } from './styles';


export function Action({ icon, label, onClick }) {
	return (
		<Button onClick={onClick}>
			{icon}
			<Tooltip>{label}</Tooltip>
		</Button>
	);
}
