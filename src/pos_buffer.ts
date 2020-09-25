import { Instruction, Mode } from './payload_spec';

export default class PosBuffer {
  private buffer: Buffer;

  constructor(array: number[], private options: BufferOptions = {}, private offsetBytes: number = 0, private offsetBits: number = 0) {
    this.buffer = Buffer.from(array);
  }

  public read(instruction: new (name: string | null, options?: any) => Instruction) {
    const state: any = { result: {}, storedVars: {}, mode: this.options.endianness || Mode.BE, offset: { bytes: this.offsetBytes, bits: this.offsetBits}};
    const dataInstruction = new instruction(null, {});
    const value = dataInstruction.execute(this.buffer, state);
    this.addOffset(dataInstruction.size);
    return value;
  }

  public skip(bytes: number) {
    this.addOffset(bytes * 8);
    if (this.offsetBytes > this.buffer.length - 1 || this.offsetBytes < 0) {
      throw new Error('Attempt to skip outside the buffer');
    }
    return this;
  }

  public peek(instruction: new (name: string | null, options?: any) => Instruction, byteOffset: number) {
    const state: any = { result: {}, storedVars: {}, mode: this.options.endianness || Mode.BE, offset: { bytes: byteOffset, bits: 0 }};
    const value = new instruction(null, {}).execute(this.buffer, state);
    return value;
  }

  private addOffset(bitSize: number) {
    const currentOffsetInBits = (this.offsetBytes * 8) + this.offsetBits;
    const updatedOffsetInBits = currentOffsetInBits + bitSize;
    this.offsetBytes = Math.floor(updatedOffsetInBits / 8);
    this.offsetBits = updatedOffsetInBits % 8;
  }

}

export interface BufferOptions {
  endianness?: Mode;
}