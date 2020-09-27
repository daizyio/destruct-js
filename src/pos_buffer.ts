import { Instruction, Mode } from './payload_spec';

export default class PosBuffer {
  private buffer: Buffer;
  private offsetBytes: number = 0;
  private offsetBits: number = 0;

  constructor(bytes: Buffer | number[], private options: BufferOptions = {}) {
    this.buffer = Buffer.from(bytes);
  }

  public read(instruction: new (name: string | null, options?: any) => Instruction, options?: TypeOptions) {
    if (this.offsetBytes > this.buffer.length - 1) {
      throw new Error('Attempt to read outside of the buffer');
    }

    const state: any = { result: {}, storedVars: {}, mode: this.options.endianness || Mode.BE, offset: { bytes: this.offsetBytes, bits: this.offsetBits}};
    const dataInstruction = new instruction(null, options);
    const value = dataInstruction.execute(this.buffer, state);
    this.updateOffset(dataInstruction.size);
    return value;
  }

  public skip(bytes: number) {
    this.updateOffset(bytes * 8);
    if (this.offsetBytes > this.buffer.length - 1 || this.offsetBytes < 0) {
      throw new Error('Attempt to skip outside the buffer');
    }
    return this;
  }

  public peek(instruction: new (name: string | null, options?: any) => Instruction, byteOffset: number) {
    const dataInstruction = new instruction(null, {});
    if (byteOffset < 0 || (byteOffset + this.addOffset(dataInstruction.size).bytes) > this.buffer.length ) {
      throw new Error('Attempt to peek outside of the buffer');
    }
    const state: any = { result: {}, storedVars: {}, mode: this.options.endianness || Mode.BE, offset: { bytes: byteOffset, bits: 0 }};
    const value = dataInstruction.execute(this.buffer, state);
    return value;
  }

  public pad() {
    this.offsetBytes += 1;
    this.offsetBits = 0;
  }

  private addOffset(bitSize: number): { bytes: number, bits: number} {
    const currentOffsetInBits = (this.offsetBytes * 8) + this.offsetBits;
    const updatedOffsetInBits = currentOffsetInBits + bitSize;

    return { bytes: Math.floor(updatedOffsetInBits / 8), bits: updatedOffsetInBits % 8 };
  }

  private updateOffset(bitSize: number): void {
    const updateOffset = this.addOffset(bitSize);
    this.offsetBytes = updateOffset.bytes;
    this.offsetBits = updateOffset.bits;
  }
}

export type Encoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'binary' | 'hex' | 'latin1';

export interface BufferOptions {
  endianness?: Mode;
}

export interface TypeOptions {
  size?: number;
  encoding?: Encoding;
  terminator?: string | number;
  dp?: number;
}