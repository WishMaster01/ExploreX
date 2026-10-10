export class MalformedAiOutputError extends Error {
  constructor() {
    super("AI provider returned a response that failed output validation");
    this.name = "MalformedAiOutputError";
  }
}
