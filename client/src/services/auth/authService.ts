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
  platform: string;
  version: string;
}

interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

interface PairedServer {
  id: string;
  serverUrl: string;
  serverName?: string;
  token: string;
  refreshToken: string;
  deviceId: string;
  pairedAt: number;
  isActive: boolean;
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
  private readonly PAIRED_SERVERS_KEY = 'trae_paired_servers';
  private readonly ACTIVE_SERVER_ID_KEY = 'trae_active_server_id';

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
    const platform = Platform.OS;
    const version = String(Platform.Version);

    const pairingRequest: PairingRequest = {
      code: pairingCode,
      deviceId,
      deviceName,
      platform,
      version
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
      
      const serverId = `server_${Date.now()}`;
      const newServer: PairedServer = {
        id: serverId,
        serverUrl,
        token: data.token,
        refreshToken: data.refreshToken,
        deviceId,
        pairedAt: Date.now(),
        isActive: true
      };
      
      await this.addPairedServer(newServer);
      await this.setActiveServer(serverId);
      
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
      
      const activeServer = await this.getActiveServer();
      if (activeServer) {
        activeServer.token = data.token;
        activeServer.refreshToken = data.refreshToken;
        await this.updatePairedServer(activeServer);
      }
      
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

  async getPairedServers(): Promise<PairedServer[]> {
    try {
      const serversJson = await AsyncStorage.getItem(this.PAIRED_SERVERS_KEY);
      return serversJson ? JSON.parse(serversJson) : [];
    } catch {
      return [];
    }
  }

  async addPairedServer(server: PairedServer): Promise<void> {
    const servers = await this.getPairedServers();
    servers.push(server);
    await AsyncStorage.setItem(this.PAIRED_SERVERS_KEY, JSON.stringify(servers));
  }

  async updatePairedServer(updatedServer: PairedServer): Promise<void> {
    const servers = await this.getPairedServers();
    const index = servers.findIndex(s => s.id === updatedServer.id);
    if (index !== -1) {
      servers[index] = updatedServer;
      await AsyncStorage.setItem(this.PAIRED_SERVERS_KEY, JSON.stringify(servers));
    }
  }

  async removePairedServer(serverId: string): Promise<void> {
    const servers = await this.getPairedServers();
    const filteredServers = servers.filter(s => s.id !== serverId);
    await AsyncStorage.setItem(this.PAIRED_SERVERS_KEY, JSON.stringify(filteredServers));
    
    const activeServerId = await this.getActiveServerId();
    if (activeServerId === serverId && filteredServers.length > 0) {
      await this.setActiveServer(filteredServers[0].id);
    } else if (filteredServers.length === 0) {
      await this.removeActiveServer();
      await this.removeToken();
      await AsyncStorage.removeItem(this.SERVER_URL_KEY);
    }
  }

  async getActiveServerId(): Promise<string | null> {
    return await AsyncStorage.getItem(this.ACTIVE_SERVER_ID_KEY);
  }

  async getActiveServer(): Promise<PairedServer | null> {
    const activeServerId = await this.getActiveServerId();
    if (!activeServerId) return null;
    
    const servers = await this.getPairedServers();
    return servers.find(s => s.id === activeServerId) || null;
  }

  async setActiveServer(serverId: string): Promise<void> {
    const servers = await this.getPairedServers();
    const server = servers.find(s => s.id === serverId);
    
    if (server) {
      await AsyncStorage.setItem(this.ACTIVE_SERVER_ID_KEY, serverId);
      await this.saveToken(server.token, server.refreshToken);
      await this.saveServerUrl(server.serverUrl);
      
      for (const s of servers) {
        s.isActive = s.id === serverId;
      }
      await AsyncStorage.setItem(this.PAIRED_SERVERS_KEY, JSON.stringify(servers));
    }
  }

  async removeActiveServer(): Promise<void> {
    await AsyncStorage.removeItem(this.ACTIVE_SERVER_ID_KEY);
  }

  async logout(): Promise<void> {
    await this.removeToken();
  }

  async logoutFromAll(): Promise<void> {
    await this.removeToken();
    await AsyncStorage.removeItem(this.SERVER_URL_KEY);
    await AsyncStorage.removeItem(this.PAIRED_SERVERS_KEY);
    await AsyncStorage.removeItem(this.ACTIVE_SERVER_ID_KEY);
  }
}

export default new AuthService();
