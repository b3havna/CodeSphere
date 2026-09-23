import {io} from 'socket.io-client';

export const initSocket = async (token) => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '';
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket', 'polling'],
        auth: {
            token: authToken
        }
    };
    return io(process.env.REACT_APP_API_URL, options);
};