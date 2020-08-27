import { Mode, Instruction, ReaderState } from './payload_spec';

abstract class ThenableInstruction implements Instruction {
  private _then: (value: any) => any;

  constructor(private _name: string | null, options?: any) {
    this._then = options?.then;
  }

  abstract execute(buffer: Buffer, readerState: ReaderState): number | string;
  abstract size: number;
  
  get name() {
    return this._name;
  }

  public then(value: any): any {
    if (this._then) {
      return this._then(value);
    } else {
      return value;
    }
  }
}

export abstract class NumericDataType extends ThenableInstruction {
  abstract be: (offset: number) => any;
  abstract le: (offset: number) => any;
  abstract bitSize: () => number;

  public execute(buffer: Buffer, readerState: ReaderState): number {
    const valueFunction = (readerState.mode === Mode.BE) ? this.be : this.le;
    const boundFunction = valueFunction.bind(buffer);
    const value = boundFunction(readerState.offset);
    const thennedValue = this.then(value);
    if (this.name) {
      readerState.result[this.name] = thennedValue;
    }
    return thennedValue;
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
  constructor(name: string | null, options?: any) {
    super(name, options);
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

export class Text extends ThenableInstruction {
  private _size: number;
  private terminator: number;
  private encoding: Encoding;

  constructor(name: string | null, options?: any) {
    super(name, options);
    this._size = options?.size;
    this.encoding = options?.encoding || 'utf8';
    this.terminator = options?.terminator;
  }

  public execute(buffer: Buffer, readerState: ReaderState) {
    const startingBuffer = buffer.slice(readerState.offset);
    let workingBuffer: Buffer = startingBuffer;
    if (this._size) {
      workingBuffer = startingBuffer.slice(0, this._size);
    } else if (this.terminator != null) {
      const index = startingBuffer.findIndex(b => b == this.terminator);
      if (index > -1) {
        this._size = index + 1;
        workingBuffer = startingBuffer.slice(0, index);
      }
    }
    const value = this.then(workingBuffer.toString(this.encoding));
    if (this.name) {
      readerState.result[this.name] = value;
    }

    return value;
  }

  get size() {
    return this._size;
  }
}