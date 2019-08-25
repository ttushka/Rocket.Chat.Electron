import { remote } from 'electron';


const { app } = remote;

export const useQuitApp = () => app.quit.bind(app);
