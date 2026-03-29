import crypto from 'crypto';

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
  private sessions: Map<string, PairingSession> = new Map();
  private devices: Map<string, DeviceInfo> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private pairingLock: boolean = false;

  constructor() {
    // 启动定时清理任务，每1分钟清理一次
    this.startCleanupInterval();
  }

  generatePairingCode(): PairingSession {
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

    this.sessions.set(id, session);

    this.cleanupExpiredSessions();

    return session;
  }

  validatePairingCode(code: string): PairingSession | null {
    this.cleanupExpiredSessions();

    for (const session of this.sessions.values()) {
      if (session.code === code && session.expiresAt > new Date() && !session.paired) {
        return session;
      }
    }

    return null;
  }

  completePairing(sessionId: string, deviceId: string, deviceName: string, platform: string, version: string): boolean {
    // 检查锁定状态，防止并发配对
    if (this.pairingLock) {
      return false;
    }

    // 获取配对锁
    this.pairingLock = true;

    try {
      const session = this.sessions.get(sessionId);
      if (session && !session.paired && session.expiresAt > new Date()) {
        session.paired = true;
        session.deviceId = deviceId;

        const device: DeviceInfo = {
          id: deviceId,
          name: deviceName,
          platform,
          version,
          lastSeen: Date.now(),
          pairedAt: Date.now(),
          permissionLevel: 2
        };

        this.devices.set(deviceId, device);
        return true;
      }
      return false;
    } finally {
      // 释放配对锁
      this.pairingLock = false;
    }
  }

  cleanupExpiredSessions() {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }

  getSessionById(sessionId: string): PairingSession | null {
    this.cleanupExpiredSessions();
    return this.sessions.get(sessionId) || null;
  }

  getDevice(deviceId: string): DeviceInfo | null {
    return this.devices.get(deviceId) || null;
  }

  getAllDevices(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  updateDeviceLastSeen(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.lastSeen = Date.now();
    }
  }

  removeDevice(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }

  updateDeviceName(deviceId: string, name: string): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      device.name = name;
      return true;
    }
    return false;
  }

  updateDevicePermission(deviceId: string, permissionLevel: number): boolean {
    const device = this.devices.get(deviceId);
    if (device) {
      device.permissionLevel = permissionLevel;
      return true;
    }
    return false;
  }

  isDevicePaired(deviceId: string): boolean {
    return this.devices.has(deviceId);
  }

  private startCleanupInterval() {
    // 每1分钟清理一次过期会话
    // 每30分钟清理一次不活跃设备
    let counter = 0;
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
      
      // 每30分钟（30个1分钟间隔）清理一次不活跃设备
      counter++;
      if (counter % 30 === 0) {
        this.cleanupInactiveDevices();
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
  cleanupInactiveDevices() {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    for (const [deviceId, device] of this.devices.entries()) {
      if (device.lastSeen < thirtyDaysAgo) {
        this.devices.delete(deviceId);
      }
    }
  }
}

export default new PairingService();
