import { Mode, Instruction } from './payload_spec';

export abstract class NumericDataType implements Instruction {
  abstract be: (offset: number) => any;
  abstract le: (offset: number) => any;
  abstract bitSize: () => number;

  public get(buffer: Buffer, offset: number, mode: Mode): number {
    const valueFunction = (mode === Mode.BE) ? this.be : this.le;
    const boundFunction = valueFunction.bind(buffer);
    const value = boundFunction(offset);
    return this.then(value);
  }

  public then(value: number): number {
    return value;
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

abstract class FloatingPointDataType extends NumericDataType {
  private dp: number | null;
  constructor(options?: any) {
    super();
    this.dp = options?.dp;
  }

  public then(value: number): number {
    return this.dp ? parseFloat(value.toFixed(this.dp)) : value;
  }
}

export class Float extends FloatingPointDataType {
  public be = Buffer.prototype.readFloatBE;
  public le = Buffer.prototype.readFloatLE;
  public bitSize = () => 32;
}

export class Double extends FloatingPointDataType {
  public be = Buffer.prototype.readDoubleBE;
  public le = Buffer.prototype.readDoubleLE;
  public bitSize = () => 64;
}

type Encoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'binary' | 'hex' | 'latin1';

export class Text implements Instruction {
  private _size: number;
  private encoding: Encoding;

  constructor(options?: any) {
    this._size = options?.size;
    this.encoding = options?.encoding || 'utf8';
  }

  public get(buffer: Buffer, offset: number, mode: Mode) {
    return buffer.slice(offset, offset + this._size).toString(this.encoding);
  }

  get size() {
    return this._size;
  }
}