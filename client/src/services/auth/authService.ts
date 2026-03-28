import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface AuthResponse {
  token: string;
  refreshToken: string;
  deviceId: string;
  userId: string;
}

interface PairingRequest {
  code: string;
  deviceId: string;
  deviceName: string;
}

interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export class AuthError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

class AuthService {
  private readonly TOKEN_KEY = 'trae_auth_token';
  private readonly REFRESH_TOKEN_KEY = 'trae_refresh_token';
  private readonly DEVICE_ID_KEY = 'trae_device_id';
  private readonly SERVER_URL_KEY = 'trae_server_url';

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

  async saveToken(token: string, refreshToken: string): Promise<void> {
    await AsyncStorage.setItem(this.TOKEN_KEY, token);
    await AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(this.TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(this.TOKEN_KEY);
    await AsyncStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  async saveServerUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(this.SERVER_URL_KEY, url);
  }

  async getServerUrl(): Promise<string | null> {
    return await AsyncStorage.getItem(this.SERVER_URL_KEY);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  async getDeviceName(): Promise<string> {
    const platform = Platform.OS;
    const version = Platform.Version;
    return `Trae Mobile ${platform.charAt(0).toUpperCase() + platform.slice(1)} ${version}`;
  }

  async pairWithServer(serverUrl: string, pairingCode: string): Promise<AuthResponse> {
    const deviceId = await this.generateDeviceId();
    const deviceName = await this.getDeviceName();

    const pairingRequest: PairingRequest = {
      code: pairingCode,
      deviceId,
      deviceName
    };

    try {
      const response = await fetch(`${serverUrl}/api/auth/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pairingRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new AuthError(
          errorData.error || 'Pairing failed',
          errorData.code || 'PAIRING_FAILED',
          response.status
        );
      }

      const data = await response.json();
      await this.saveToken(data.token, data.refreshToken);
      await this.saveServerUrl(serverUrl);
      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Network error: Failed to connect to server',
        'NETWORK_ERROR',
        0
      );
    }
  }

  async refreshToken(serverUrl: string): Promise<RefreshTokenResponse> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      throw new AuthError('No refresh token available', 'NO_REFRESH_TOKEN', 401);
    }

    try {
      const response = await fetch(`${serverUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new AuthError(
          errorData.error || 'Token refresh failed',
          errorData.code || 'REFRESH_FAILED',
          response.status
        );
      }

      const data = await response.json();
      await this.saveToken(data.token, data.refreshToken);
      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        'Network error: Failed to refresh token',
        'NETWORK_ERROR',
        0
      );
    }
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

  async logout(): Promise<void> {
    await this.removeToken();
  }
}

export default new AuthService();
