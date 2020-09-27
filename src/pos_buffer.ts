import { DataType } from '.';
import { Instruction, Mode, Primitive, Value, ValueProducer } from './payload_spec';

export default class PosBuffer {
  private _buffer: Buffer;
  private offsetBytes: number = 0;
  private offsetBits: number = 0;

  constructor(bytes: Buffer | number[], private options: BufferOptions = {}) {
    this._buffer = Buffer.from(bytes);
  }

  public read(instruction: new (name: string | null, options?: any) => DataType, options?: TypeOptions) {
    if (this.offsetBytes > this._buffer.length - 1) {
      throw new Error('Attempt to read outside of the buffer');
    }

    const state: any = { result: {}, storedVars: {}, mode: this.options.endianness || Mode.BE, offset: { bytes: this.offsetBytes, bits: this.offsetBits}};
    const dataInstruction = new instruction(null, options);
    const value = dataInstruction.execute(this, state);
    this.updateOffset(dataInstruction.size);
    return value;
  }

  public skip(bytes: number) {
    this.updateOffset(bytes * 8);
    if (this.offsetBytes > this._buffer.length - 1 || this.offsetBytes < 0) {
      throw new Error('Attempt to skip outside the buffer');
    }
    return this;
  }

  public peek(instruction: new (name: string | null, options?: any) => DataType, byteOffset: number) {
    const dataInstruction = new instruction(null, {});
    if (byteOffset < 0 || (byteOffset + this.addOffset(dataInstruction.size).bytes) > this._buffer.length ) {
      throw new Error('Attempt to peek outside of the buffer');
    }
    const state: any = { result: {}, storedVars: {}, mode: this.options.endianness || Mode.BE, offset: { bytes: byteOffset, bits: 0 }};
    const value = dataInstruction.execute(this, state);
    return value;
  }

  public pad() {
    if (this.offsetBits != 0) {
      this.offsetBytes += 1;
      this.offsetBits = 0;
    }
  }

  public slice(start: number, end?: number) {
    return new PosBuffer(this._buffer.slice(start, end));
  }

  public toString(encoding?: Encoding, start?: number, end?: number) {
    return this._buffer.toString(encoding, start, end);
  }

  public setEndianness(endianness: Mode) {
    this.options.endianness = endianness;
  }

  get length() {
    return this._buffer.length;
  }

  get buffer() {
    return this._buffer;
  }

  get offset() {
    return {
      bytes: this.offsetBytes,
      bits: this.offsetBits
    }
  }

  set offset(offset: { bytes: number, bits: number}) {
    this.offsetBytes = offset.bytes;
    this.offsetBits = offset.bits;
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