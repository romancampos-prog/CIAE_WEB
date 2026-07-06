import api from '../../shared/api/axiosInstance';

export const auth_login = async (credentials) => {
    try {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data?.detail || 'Error de conexión con el servidor';
        throw new Error(errorMsg);
    }
};
