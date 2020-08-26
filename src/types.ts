import { Mode, Instruction } from './payload_spec';

export abstract class NumericDataType implements Instruction {
  abstract be: (offset: number) => any;
  abstract le: (offset: number) => any;
  abstract bitSize: () => number;

  public get(buffer: Buffer, offset: number, mode: Mode): number {
    const valueFunction = (mode === Mode.BE) ? this.be : this.le;
    const boundFunction = valueFunction.bind(buffer);
    return boundFunction(offset);
  }

  get size() {
    return Math.floor(this.bitSize() / 8);
  }
}

export class UInt8 extends NumericDataType {
  public be = Buffer.prototype.readUInt8;
  public le = Buffer.prototype.readUInt8;
  public bitSize = () => 8;
}

export class Int8 extends NumericDataType {
  public be = Buffer.prototype.readInt8;
  public le = Buffer.prototype.readInt8;
  public bitSize = () => 8;
}

export class UInt16 extends NumericDataType {
  public be = Buffer.prototype.readUInt16BE;
  public le = Buffer.prototype.readUInt16LE;
  public bitSize = () => 16;
}

export class Int16 extends NumericDataType {
  public be = Buffer.prototype.readInt16BE;
  public le = Buffer.prototype.readInt16LE;
  public bitSize = () => 16;
}

export class UInt32 extends NumericDataType {
  public be = Buffer.prototype.readUInt32BE;
  public le = Buffer.prototype.readUInt32LE;
  public bitSize = () => 32;
}

export class Int32 extends NumericDataType {
  public be = Buffer.prototype.readInt32BE;
  public le = Buffer.prototype.readInt32LE;
  public bitSize = () => 32;
}

export class Float extends NumericDataType {
  public be = Buffer.prototype.readFloatBE;
  public le = Buffer.prototype.readFloatLE;
  public bitSize = () => 32;
}

export class Double extends NumericDataType {
  public be = Buffer.prototype.readDoubleBE;
  public le = Buffer.prototype.readDoubleLE;
  public bitSize = () => 64;
}

// export class TextData implements Instruction {
//   public get(buffer: Buffer, offset: number, mode: Mode) {
//     throw new Error('Method not implemented.');
//   }

//   get size() {
//     return 0;
//   }
// }

// export const Text = new TextData();