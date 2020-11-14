declare global {
  namespace jest {
    interface Matchers<R> {
      toBeHex(expectedHex: string): R;
    }
  }
}

expect.extend({
  toBeHex(received, expectedHex) {
    const bufferAsHex = received.toString('hex').toUpperCase();

    return bufferAsHex === expectedHex ? 
      ({ pass: true, message: () => `Expected ${bufferAsHex} not to be ${expectedHex}`})
      : ({ pass: false, message: () => `Expected ${bufferAsHex} to be ${expectedHex}` })
  }
})

export default undefined;