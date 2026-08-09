const {
  hashPassword,
  hashPasswordSync,
  comparePasswords,
  checkPasswordStrength,
  generateToken,
  decodeToken,
  toBoolean,
  removeFields,
} = require('./index');

describe('utils', () => {
  describe('hashPassword / comparePasswords', () => {
    it('produces a hash that verifies against the original password', async () => {
      const { hashedPassword, salt } = await hashPassword('Str0ng$Pw!', 10);

      expect(typeof hashedPassword).toBe('string');
      expect(typeof salt).toBe('string');
      expect(await comparePasswords('Str0ng$Pw!', hashedPassword)).toBe(true);
      expect(await comparePasswords('wrong-password', hashedPassword)).toBe(
        false,
      );
    });
  });

  describe('hashPasswordSync', () => {
    it('produces a hash that verifies synchronously-generated and async-compared', async () => {
      const { hashedPassword } = hashPasswordSync('Str0ng$Pw!', 10);

      expect(await comparePasswords('Str0ng$Pw!', hashedPassword)).toBe(true);
    });
  });

  describe('checkPasswordStrength', () => {
    it('flags a weak password', () => {
      expect(['Too weak', 'Weak']).toContain(checkPasswordStrength('12345678'));
    });

    it('accepts a strong password', () => {
      expect(checkPasswordStrength('HeK34#C44DMJ')).toBe('Strong');
    });
  });

  describe('generateToken / decodeToken', () => {
    it('round-trips a payload through a signed token', async () => {
      const token = await generateToken({ userId: 1 }, 'test-secret', '1H');
      const decoded = await decodeToken(token, 'test-secret');

      expect(decoded.userId).toBe(1);
    });

    it('throws for a token signed with a different secret', async () => {
      const token = await generateToken({ userId: 1 }, 'secret-a', '1H');

      await expect(decodeToken(token, 'secret-b')).rejects.toThrow(
        'Invalid token',
      );
    });

    it('throws for a malformed token', async () => {
      await expect(decodeToken('not-a-token', 'test-secret')).rejects.toThrow(
        'Invalid token',
      );
    });

    it('generates distinct tokens for identical payloads (no jti collision)', async () => {
      // jwt.sign is otherwise deterministic for identical
      // header+payload+secret -- two logins for the same user within the
      // same second (identical iat/exp too) would produce byte-identical
      // tokens without a unique jti, letting revocation of one silently
      // revoke an unrelated concurrent session for that user.
      const payload = { userId: 1, username: 'admin', isSuperuser: 'false' };
      const [tokenA, tokenB] = await Promise.all([
        generateToken(payload, 'test-secret', '1H'),
        generateToken(payload, 'test-secret', '1H'),
      ]);

      expect(tokenA).not.toBe(tokenB);

      const [decodedA, decodedB] = await Promise.all([
        decodeToken(tokenA, 'test-secret'),
        decodeToken(tokenB, 'test-secret'),
      ]);
      expect(decodedA.jti).toBeDefined();
      expect(decodedA.jti).not.toBe(decodedB.jti);
    });

    it('attaches the original jwt error as the cause', async () => {
      try {
        await decodeToken('not-a-token', 'test-secret');
        throw new Error('expected decodeToken to throw');
      } catch (error) {
        expect(error.cause).toBeDefined();
      }
    });
  });

  describe('toBoolean', () => {
    it.each([
      [true, true],
      [false, false],
      ['true', true],
      ['false', false],
      ['TRUE', true],
      [1, true],
      [0, false],
    ])('converts %p to %p', (input, expected) => {
      expect(toBoolean(input)).toBe(expected);
    });

    it('throws for a value that cannot be converted', () => {
      expect(() => toBoolean('not-a-boolean')).toThrow(
        'Invalid value. Cannot convert to boolean.',
      );
      expect(() => toBoolean(2)).toThrow();
      expect(() => toBoolean(null)).toThrow();
    });
  });

  describe('removeFields', () => {
    it('deletes the given fields from every row, mutating in place', async () => {
      const rows = [
        { id: 1, secret: 'a', keep: 'x' },
        { id: 2, secret: 'b', keep: 'y' },
      ];

      await removeFields(rows, ['secret']);

      expect(rows).toEqual([
        { id: 1, keep: 'x' },
        { id: 2, keep: 'y' },
      ]);
    });
  });
});
