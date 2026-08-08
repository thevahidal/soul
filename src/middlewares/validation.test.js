const Joi = require('joi');

const { validator, customValidator } = require('./validation');

const schema = Joi.object({
  body: Joi.object({ name: Joi.string().required() }).required(),
  params: Joi.object().required(),
  query: Joi.object().required(),
  cookies: Joi.object().required(),
});

describe('validator', () => {
  it('calls next() and normalizes req.* to the validated values on success', () => {
    const req = { body: { name: 'ok' }, params: {}, query: {}, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validator(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'ok' });
  });

  it('returns a 400 with the Joi error details on failure', () => {
    const req = { body: {}, params: {}, query: {}, cookies: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validator(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('name'),
      }),
    );
  });
});

describe('customValidator', () => {
  it('returns errorStatus: false on success', () => {
    const req = { body: { name: 'ok' }, params: {}, query: {}, cookies: {} };

    const result = customValidator(schema)(req);

    expect(result.errorStatus).toBe(false);
  });

  it('returns errorStatus: true with the Joi error message/details on failure', () => {
    const req = { body: {}, params: {}, query: {}, cookies: {} };

    const result = customValidator(schema)(req);

    expect(result.errorStatus).toBe(true);
    expect(result.message).toEqual(expect.stringContaining('name'));
    expect(result.error).toBeDefined();
  });
});
