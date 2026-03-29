import crypto from 'crypto';
import redisClient from '../redis/redisClient';

interface PairingSession {
  id: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  deviceId?: string;
  paired: boolean;
}

interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  version: string;
  lastSeen: number;
  pairedAt: number;
  permissionLevel: number;
}

class PairingService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private pairingLock: boolean = false;

  constructor() {
    // 启动定时清理任务，每1分钟清理一次
    this.startCleanupInterval();
  }

  async generatePairingCode(): Promise<PairingSession> {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5分钟过期

    const session: PairingSession = {
      id,
      code,
      createdAt: now,
      expiresAt,
      paired: false
    };

    // 存储到Redis，设置5分钟过期
    await redisClient.set(`pairing_session:${id}`, JSON.stringify(session), 5 * 60);
    await redisClient.set(`pairing_code:${code}`, id, 5 * 60);

    await this.cleanupExpiredSessions();

    return session;
  }

  async validatePairingCode(code: string): Promise<PairingSession | null> {
    await this.cleanupExpiredSessions();

    // 从Redis获取会话ID
    const sessionId = await redisClient.get(`pairing_code:${code}`);
    if (!sessionId) {
      return null;
    }

    // 获取会话详情
    const sessionData = await redisClient.get(`pairing_session:${sessionId}`);
    if (!sessionData) {
      return null;
    }

    const session: PairingSession = JSON.parse(sessionData);
    if (session.expiresAt > new Date() && !session.paired) {
      return session;
    }

    return null;
  }

  async completePairing(sessionId: string, deviceId: string, deviceName: string, platform: string, version: string): Promise<boolean> {
    // 检查锁定状态，防止并发配对
    if (this.pairingLock) {
      return false;
    }

    // 获取配对锁
    this.pairingLock = true;

    try {
      const sessionData = await redisClient.get(`pairing_session:${sessionId}`);
      if (!sessionData) {
        return false;
      }

      const session: PairingSession = JSON.parse(sessionData);
      if (!session.paired && session.expiresAt > new Date()) {
        // 更新会话状态
        session.paired = true;
        session.deviceId = deviceId;
        await redisClient.set(`pairing_session:${sessionId}`, JSON.stringify(session));

        // 存储设备信息
        const device: DeviceInfo = {
          id: deviceId,
          name: deviceName,
          platform,
          version,
          lastSeen: Date.now(),
          pairedAt: Date.now(),
          permissionLevel: 2
        };

        await redisClient.hset(`device:${deviceId}`, {
          name: device.name,
          platform: device.platform,
          version: device.version,
          lastSeen: device.lastSeen.toString(),
          pairedAt: device.pairedAt.toString(),
          permissionLevel: device.permissionLevel.toString()
        });

        return true;
      }
      return false;
    } finally {
      // 释放配对锁
      this.pairingLock = false;
    }
  }

  async cleanupExpiredSessions() {
    // Redis会自动过期，这里可以添加额外的清理逻辑
    // 例如清理可能的残留数据
  }

  async getSessionById(sessionId: string): Promise<PairingSession | null> {
    await this.cleanupExpiredSessions();
    const sessionData = await redisClient.get(`pairing_session:${sessionId}`);
    if (!sessionData) {
      return null;
    }
    return JSON.parse(sessionData);
  }

  async getDevice(deviceId: string): Promise<DeviceInfo | null> {
    const deviceData = await redisClient.hgetall(`device:${deviceId}`);
    if (Object.keys(deviceData).length === 0) {
      return null;
    }

    return {
      id: deviceId,
      name: deviceData.name,
      platform: deviceData.platform,
      version: deviceData.version,
      lastSeen: parseInt(deviceData.lastSeen),
      pairedAt: parseInt(deviceData.pairedAt),
      permissionLevel: parseInt(deviceData.permissionLevel)
    };
  }

  async getAllDevices(): Promise<DeviceInfo[]> {
    // 这里需要实现从Redis获取所有设备的逻辑
    // 可以使用Redis的SCAN命令或维护一个设备列表
    // 为了简化，暂时返回空数组
    return [];
  }

  async updateDeviceLastSeen(deviceId: string): Promise<void> {
    await redisClient.hset(`device:${deviceId}`, 'lastSeen', Date.now().toString());
  }

  async removeDevice(deviceId: string): Promise<boolean> {
    return await redisClient.del(`device:${deviceId}`);
  }

  async updateDeviceName(deviceId: string, name: string): Promise<boolean> {
    const exists = await redisClient.exists(`device:${deviceId}`);
    if (!exists) {
      return false;
    }
    await redisClient.hset(`device:${deviceId}`, 'name', name);
    return true;
  }

  async updateDevicePermission(deviceId: string, permissionLevel: number): Promise<boolean> {
    const exists = await redisClient.exists(`device:${deviceId}`);
    if (!exists) {
      return false;
    }
    await redisClient.hset(`device:${deviceId}`, 'permissionLevel', permissionLevel.toString());
    return true;
  }

  async isDevicePaired(deviceId: string): Promise<boolean> {
    return await redisClient.exists(`device:${deviceId}`);
  }

  private startCleanupInterval() {
    // 每1分钟清理一次过期会话
    // 每30分钟清理一次不活跃设备
    let counter = 0;
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredSessions();
      
      // 每30分钟（30个1分钟间隔）清理一次不活跃设备
      counter++;
      if (counter % 30 === 0) {
        await this.cleanupInactiveDevices();
      }
    }, 60 * 1000);
  }

  private stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // 清理过期的设备（超过30天未活跃的设备）
  async cleanupInactiveDevices() {
    // 这里需要实现从Redis获取并清理不活跃设备的逻辑
    // 可以使用Redis的SCAN命令遍历所有设备
  }
}

export default new PairingService();
