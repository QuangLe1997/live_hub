// api/flussonic.js

import axios from 'axios';

class FlussonicAPI {
    constructor(baseURL, username, password) {
        const basicAuth = btoa(`${username}:${password}`);

        // Remove /admin from baseURL if exists
        this.baseURL = baseURL.replace(/\/admin\/?$/, '');

        this.api = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json'
            },
            withCredentials: false,
            proxy: false
        });
    }

    // Test connection
    async validateConnection() {
        try {
            const response = await this.api.get('/streamer/api/v3/streams');
            return response.data;
        } catch (error) {
            console.error('Connection error:', error.response?.data || error.message);
            throw new Error('Failed to connect to Flussonic server');
        }
    }

    // Create or update stream
    async createStream(streamName, data = []) {
        try {
            const response = await this.api.put(
                `/streamer/api/v3/streams/${streamName}`,
                data
            );
            return response.data;
        } catch (error) {
            console.error('Create stream error:', error.response?.data || error.message);
            throw new Error('Failed to create stream');
        }
    }

    async deleteStream(streamName) {
        try {
            const response = await this.api.delete(
                `/streamer/api/v3/streams/${streamName}`,
            );
            return true
        } catch (error) {
            console.error('Create stream error:', error.response?.data || error.message);
            throw new Error('Failed to create stream');
        }
    }

    // Get stream info
    async getStreamInfo(streamName) {
        try {
            const response = await this.api.get(`/streamer/api/v3/streams/${streamName}`);
            return response.data?.stats || {};
        } catch (error) {
            console.error('Get stream info error:', error.response?.data || error.message);
            throw new Error('Failed to get stream info');
        }
    }

}

export default FlussonicAPI;
