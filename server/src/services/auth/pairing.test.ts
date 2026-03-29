import pairingService from './pairing';

describe('PairingService', () => {
  test('generatePairingCode should return a valid session', () => {
    const session = pairingService.generatePairingCode();
    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('code');
    expect(session.code).toHaveLength(6);
    expect(session.paired).toBe(false);
    expect(session.expiresAt).toBeInstanceOf(Date);
  });

  test('validatePairingCode should return session for valid code', () => {
    const session = pairingService.generatePairingCode();
    const validatedSession = pairingService.validatePairingCode(session.code);
    expect(validatedSession).toBeTruthy();
    expect(validatedSession?.id).toBe(session.id);
  });

  test('validatePairingCode should return null for invalid code', () => {
    const validatedSession = pairingService.validatePairingCode('INVALID');
    expect(validatedSession).toBeNull();
  });

  test('completePairing should return true for valid session', () => {
    const session = pairingService.generatePairingCode();
    const result = pairingService.completePairing(
      session.id, 
      'test-device-id',
      'Test Device',
      'iOS',
      '1.0.0'
    );
    expect(result).toBe(true);
  });

  test('completePairing should return false for invalid session', () => {
    const result = pairingService.completePairing(
      'invalid-session-id', 
      'test-device-id',
      'Test Device',
      'iOS',
      '1.0.0'
    );
    expect(result).toBe(false);
  });

  test('getSessionById should return session for valid id', () => {
    const session = pairingService.generatePairingCode();
    const retrievedSession = pairingService.getSessionById(session.id);
    expect(retrievedSession).toBeTruthy();
    expect(retrievedSession?.id).toBe(session.id);
  });

  test('getSessionById should return null for invalid id', () => {
    const retrievedSession = pairingService.getSessionById('invalid-session-id');
    expect(retrievedSession).toBeNull();
  });

  test('getDevice should return device info after pairing', () => {
    const session = pairingService.generatePairingCode();
    pairingService.completePairing(
      session.id, 
      'test-device-1',
      'Test Device 1',
      'Android',
      '2.0.0'
    );
    const device = pairingService.getDevice('test-device-1');
    expect(device).toBeTruthy();
    expect(device?.name).toBe('Test Device 1');
    expect(device?.platform).toBe('Android');
  });

  test('getAllDevices should return all paired devices', () => {
    const session1 = pairingService.generatePairingCode();
    pairingService.completePairing(
      session1.id, 
      'test-device-2',
      'Test Device 2',
      'iOS',
      '1.0.0'
    );
    
    const session2 = pairingService.generatePairingCode();
    pairingService.completePairing(
      session2.id, 
      'test-device-3',
      'Test Device 3',
      'Windows',
      '10'
    );
    
    const devices = pairingService.getAllDevices();
    expect(devices.length).toBeGreaterThanOrEqual(2);
  });

  test('removeDevice should remove device from list', () => {
    const session = pairingService.generatePairingCode();
    pairingService.completePairing(
      session.id, 
      'test-device-4',
      'Test Device 4',
      'MacOS',
      '12'
    );
    
    const result = pairingService.removeDevice('test-device-4');
    expect(result).toBe(true);
    
    const device = pairingService.getDevice('test-device-4');
    expect(device).toBeNull();
  });

  test('isDevicePaired should return correct status', () => {
    const session = pairingService.generatePairingCode();
    pairingService.completePairing(
      session.id, 
      'test-device-5',
      'Test Device 5',
      'Linux',
      '20.04'
    );
    
    expect(pairingService.isDevicePaired('test-device-5')).toBe(true);
    expect(pairingService.isDevicePaired('non-existent-device')).toBe(false);
  });
});
