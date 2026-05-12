/**
 * Server Configuration
 * Change this file to switch between different server URLs
 * Phone 1: 100.70.131.60:5000
 * Phone 2: 192.168.91.72:5000
 * Laptop: 192.168.91.72:5000
 */

// Change this IP based on which phone/laptop you're connecting from
const SERVER_IP = "192.168.91.72"; // Change this to your current connection IP

export const SERVER_CONFIG = {
  BASE_URL: `http://${SERVER_IP}:5000`,
  API_URL: `http://${SERVER_IP}:5000/api`,
};

export default SERVER_CONFIG;
