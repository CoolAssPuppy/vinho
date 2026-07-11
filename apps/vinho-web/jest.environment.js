const JSDOMEnvironment = require("jest-environment-jsdom").default;

/**
 * jsdom does not expose the WHATWG fetch primitives (fetch/Request/Response/
 * Headers) or a few other web globals that Node 18+ provides natively. Libraries
 * like @supabase/storage-js reference `Response` at module load and throw
 * "Response is not defined" under the stock jsdom environment. Copy the missing
 * globals from the Node realm so tests run against real implementations.
 */
class NodeWebGlobalsJSDOMEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);

    const webGlobals = [
      "fetch",
      "Request",
      "Response",
      "Headers",
      "FormData",
      "ReadableStream",
      "TextEncoder",
      "TextDecoder",
      "structuredClone",
      "BroadcastChannel",
    ];

    for (const name of webGlobals) {
      if (this.global[name] === undefined && globalThis[name] !== undefined) {
        this.global[name] = globalThis[name];
      }
    }
  }
}

module.exports = NodeWebGlobalsJSDOMEnvironment;
