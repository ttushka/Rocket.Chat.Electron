import styled from 'styled-components';


export const Outer = styled.section`
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: ${ ({ isVisible }) => (isVisible ? 1 : 'unset') };
	opacity: ${ ({ isVisible }) => (isVisible ? 1 : 0) };
	transition: opacity linear 100ms;
`;

export const Inner = styled.div`
	position: relative;
	width: 100%;
	height: 100%;
	display: flex;
	flex-flow: column nowrap;
	overflow-y: auto;
`;
