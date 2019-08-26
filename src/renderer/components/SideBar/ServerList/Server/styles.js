import styled, { css } from 'styled-components';
import { Tooltip } from '../../styles';


export const Outer = styled.li`
	position: relative;
	margin: 4px 0;
	padding-right: 4px;
	display: flex;
	flex-flow: row nowrap;
	align-items: center;
	cursor: pointer;

	&:hover ${ Tooltip } {
		visibility: visible;
		transform: translateX(0);
		opacity: 1;
	}
`;

export const Indicator = styled.div`
	flex: 0 0 4px;
	${ ({ active, unread }) => (
		(active && css`height: 100%;`) ||
		(unread && css`height: 8px;`) ||
		css`height: 0;`
	) }
	transition: height 300ms;
	border-radius: 0 4px 4px 0;
	background-color: var(--color-gray-lightest);
`;

export const Inner = styled.div`
	position: relative;
	flex: 1;
	display: flex;
	flex-flow: column nowrap;
	align-items: center;
	transition: transform 300ms;

	${ Outer }:active & {
		transform: scale(0.9);
	}
`;

export const Initials = styled.span`
	width: 40px;
	height: 40px;
	border-radius: 4px;
	background-color: var(--color-gray-lightest);
	color: var(--color-darkest);
	text-align: center;
	font-size: 1.5rem;
	line-height: 40px;
	transition: opacity 300ms;
	${ ({ active, faviconLoaded, shortcut }) => (
		(faviconLoaded && css`opacity: 0;`) ||
		(shortcut && css`opacity: 0;`) ||
		(active && css`opacity: 1;`) ||
		css`opacity: 0.5;`
	) }
	${ ({ active, faviconLoaded }) => !faviconLoaded && css`
		${ Outer }:hover & {
			${ (active && css`opacity: 1;`) || css`opacity: 0.75;` }
		}
	` }
`;

export const Favicon = styled.img`
	width: 40px;
	height: 40px;
	margin-top: -40px;
	transition: opacity 300ms;
	${ ({ active, faviconLoaded, shortcut }) => (
		(!faviconLoaded && css`opacity: 0;`) ||
		(shortcut && css`opacity: 0;`) ||
		(active && css`opacity: 1;`) ||
		css`opacity: 0.5;`
	) }
	${ ({ active, faviconLoaded }) => faviconLoaded && css`
		${ Outer }:hover & {
			${ (active && css`opacity: 1;`) || css`opacity: 0.75;` }
		}
	` }
`;

export const Badge = styled.span`
	position: absolute;
	right: 0;
	top: 0;
	min-width: 18px;
	height: 18px;
	padding: 0 4px;
	text-align: center;
	color: var(--color-white);
	border-radius: 20px;
	background-color: var(--color-dark-red);
	font-size: 12px;
	font-weight: 700;
	line-height: 18px;
	z-index: 1;
`;

export const Shortcut = styled.span`
	width: 40px;
	height: 40px;
	margin-top: -40px;
	border-radius: 4px;
	background-color: var(--color-gray-lightest);
	color: var(--color-darkest);
	text-align: center;
	font-size: 1.5rem;
	line-height: 40px;
	${ ({ visible }) => (
		(visible && css`opacity: 1;`) ||
		css`opacity: 0;`
	) }
	transition: opacity 300ms;
`;
