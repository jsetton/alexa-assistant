export class AlexaAssistantError extends Error {
  constructor(code, options = {}) {
    super(code, options);

    this.name = 'AlexaAssistantError';
    this.code = code;
  }
}
