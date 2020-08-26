import { Mode, Instruction } from './payload_spec';

export abstract class NumericDataType implements Instruction {
  abstract be: (buffer: Buffer) => (offset: number) => any;
  abstract le: (buffer: Buffer) => (offset: number) => any;
  abstract bitSize: () => number;

  public get(buffer: Buffer, offset: number, mode: Mode): number {
    const valueFunction = (mode === Mode.BE) ? this.be(buffer) : this.le(buffer);
    const boundFunction = valueFunction.bind(buffer);
    return boundFunction(offset);
  }

  get size() {
    return Math.floor(this.bitSize() / 8);
  }
}

class UnsignedByte extends NumericDataType {
  public be = (buf: Buffer) => { return buf.readUInt8 };
  public le = (buf: Buffer) => { return buf.readUInt8 };
  public bitSize = () => 8;
}

class SignedByte extends NumericDataType {
  public be = (buf: Buffer) => { return buf.readInt8 };
  public le = (buf: Buffer) => { return buf.readInt8 };
  public bitSize = () => 8;
}

class UnsignedWord extends NumericDataType {
  public be = (buf: Buffer) => { return buf.readUInt16BE };
  public le = (buf: Buffer) => { return buf.readUInt16LE };
  public bitSize = () => 16;
}

class SignedWord extends NumericDataType {
  public be = (buf: Buffer) => { return buf.readInt16BE };
  public le = (buf: Buffer) => { return buf.readInt16LE };
  public bitSize = () => 16;
}

class UnsignedLong extends NumericDataType {
  public be = (buf: Buffer) => { return buf.readUInt32BE };
  public le = (buf: Buffer) => { return buf.readUInt32LE };
  public bitSize = () => 32;
}

class SignedLong extends NumericDataType {
  public be = (buf: Buffer) => { return buf.readInt32BE };
  public le = (buf: Buffer) => { return buf.readInt32LE };
  public bitSize = () => 32;
}

class SingleFloat extends NumericDataType {
  public be = (buf: Buffer) => { return buf.readFloatBE };
  public le = (buf: Buffer) => { return buf.readFloatLE };
  public bitSize = () => 32;
}

class DoubleFloat extends NumericDataType {
  public be = (buf: Buffer) => { return buf.readDoubleBE };
  public le = (buf: Buffer) => { return buf.readDoubleLE };
  public bitSize = () => 64;
}

export const UInt8 = new UnsignedByte();
export const Int8 = new SignedByte();
export const UInt16 = new UnsignedWord();
export const Int16 = new SignedWord();
export const UInt32 = new UnsignedLong();
export const Int32 = new SignedLong();
export const Float = new SingleFloat();
export const Double = new DoubleFloat();

// export class TextData implements Instruction {
//   public get(buffer: Buffer, offset: number, mode: Mode) {
//     throw new Error('Method not implemented.');
//   }

//   get size() {
//     return 0;
//   }
// }

// export const Text = new TextData();