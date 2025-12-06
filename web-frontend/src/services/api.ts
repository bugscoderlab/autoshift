import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('autoshift-auth');
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.state?.accessToken) {
          config.headers.Authorization = `Bearer ${parsed.state.accessToken}`;
        }
      } catch {
        // Invalid token
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const token = localStorage.getItem('autoshift-auth');
        if (token) {
          const parsed = JSON.parse(token);
          const refreshToken = parsed.state?.refreshToken;

          if (refreshToken) {
            const response = await axios.post('/api/v1/auth/refresh', {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;

            parsed.state.accessToken = accessToken;
            parsed.state.refreshToken = newRefreshToken;
            localStorage.setItem('autoshift-auth', JSON.stringify(parsed));

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        localStorage.removeItem('autoshift-auth');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

