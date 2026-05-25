import axios from 'axios';

const api = axios.create({
  baseURL: 'https://erp-system-1-0yod.onrender.com/api',
});

// Interceptor: Har request ke sath token bhejne ke liye
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user'));

  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }

  return config;
});

// AI Assistant API Call
export const askAiAssistant = async (promptText) => {
  try {
    const response = await api.post('/ai/ask', {
      prompt: promptText
    });

    return response.data.answer;
  } catch (error) {
    console.error("Error asking AI:", error);
    return "System connect nahi ho paaya.";
  }
};

export default api;