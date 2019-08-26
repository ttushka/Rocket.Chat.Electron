import styled from 'styled-components';


export const Outer = styled.div`
	width: 100vw;
	height: 100vh;
	display: flex;
	flex-flow: row nowrap;
	cursor: default;
	user-select: none;
	background-color: var(--color-dark);
`;

export const DraggableRegion = styled.div`
	position: fixed;
	width: 100vw;
	height: 22px;
	-webkit-app-region: drag;
	z-index: 3;
`;

export const Inner = styled.main`
	flex: 1;
	display: flex;
	flex-flow: row nowrap;
	align-items: stretch;
`;

export const Views = styled.article`
	flex: 1;
	position: relative;
`;
