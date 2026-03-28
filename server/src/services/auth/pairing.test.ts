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
    const result = pairingService.completePairing(session.id, 'test-device-id');
    expect(result).toBe(true);
  });

  test('completePairing should return false for invalid session', () => {
    const result = pairingService.completePairing('invalid-session-id', 'test-device-id');
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
});
