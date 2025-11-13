export interface SchnorrQ {
  generatePublicKey(secretKey: Uint8Array): Uint8Array;
  sign(secretKey: Uint8Array, publicKey: Uint8Array, message: Uint8Array): Uint8Array;
  verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): number;
}

export interface QubicCrypto {
  schnorrq: SchnorrQ;
  K12(input: Uint8Array, output: Uint8Array, outputLength: number, outputOffset?: number): void;
}

declare const crypto: Promise<QubicCrypto> & {
  keccakP160012(input: Uint8Array, rounds: number): void;
};
export default crypto;
