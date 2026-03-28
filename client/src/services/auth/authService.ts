import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthResponse {
  token: string;
  deviceId: string;
  userId: string;
}

interface PairingRequest {
  code: string;
  deviceId: string;
  deviceName: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'trae_auth_token';
  private readonly DEVICE_ID_KEY = 'trae_device_id';

  async generateDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  async getDeviceId(): Promise<string | null> {
    return await AsyncStorage.getItem(this.DEVICE_ID_KEY);
  }

  async saveToken(token: string): Promise<void> {
    await AsyncStorage.setItem(this.TOKEN_KEY, token);
  }

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(this.TOKEN_KEY);
  }

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(this.TOKEN_KEY);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  async pairWithServer(serverUrl: string, pairingCode: string): Promise<AuthResponse> {
    const deviceId = await this.generateDeviceId();
    const deviceName = 'Trae Mobile App';

    const pairingRequest: PairingRequest = {
      code: pairingCode,
      deviceId,
      deviceName
    };

    const response = await fetch(`${serverUrl}/api/auth/pair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pairingRequest)
    });

    if (!response.ok) {
      throw new Error('Pairing failed');
    }

    const data = await response.json();
    await this.saveToken(data.token);
    return data;
  }

  async validateToken(serverUrl: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`${serverUrl}/api/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export default new AuthService();
