import PosBuffer, { Encoding, Mode, TypeOptions } from './pos_buffer';

export abstract class DataType {

  constructor(protected options?: TypeOptions) {}

  abstract execute(buffer: PosBuffer): number | string | boolean;
  abstract size: number;
}

export abstract class NumericDataType extends DataType {
  abstract be: (offset: number) => any;
  abstract le: (offset: number) => any;
  abstract bitSize: () => number;

  public execute(buffer: PosBuffer): number {
    this.assertAtByteBoundary(buffer.offset);
    const valueFunction = (buffer.mode === Mode.BE) ? this.be : this.le;
    const boundFunction = valueFunction.bind(buffer.buffer);
    const value = boundFunction(buffer.offset.bytes);
    return value;
  }

  private assertAtByteBoundary(offset: { bytes: number, bits: number}): void {
    if (offset.bits !== 0) {
      throw new Error(`Buffer position is not at a byte boundary (bit offset ${offset.bits}). Do you need to use pad()?`)
    }
  }

  get size() {
    return this.bitSize();
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

  constructor(options?: any) {
    super(options);
  }

  public execute(buffer: PosBuffer): number {
    const value = super.execute(buffer);
    return this.options?.dp ? parseFloat(value.toFixed(this.options?.dp)) : value;
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

export class Text extends DataType {
  private _size: number;
  private terminator: number | undefined;
  private encoding: Encoding;

  constructor(options?: any) {
    super(options);
    this._size = options?.size;
    this.encoding = options?.encoding || 'utf8';
    this.terminator = this.convertTerminator(options?.terminator);
  }

  public execute(posBuffer: PosBuffer) {
    const startingBuffer = posBuffer.buffer.slice(posBuffer.offset.bytes);
    let workingBuffer: Buffer = startingBuffer;
    if (this._size) {
      workingBuffer = startingBuffer.slice(0, this._size);
    } else if (this.terminator != null) {
      const index = startingBuffer.findIndex(b => b == this.terminator);
      if (index > -1) {
        this._size = index + 1;
        workingBuffer = startingBuffer.slice(0, index);
      }
    } else {
      this._size = workingBuffer.length;
    }
    return workingBuffer.toString(this.encoding);
  }

  get size() {
    return this._size * 8;
  }

  private convertTerminator(terminator: string | number | undefined): number | undefined {
    if (typeof terminator === 'number') {
      return terminator;
    } else if (typeof terminator === 'string') {
      if (terminator.length > 1) throw new Error('Terminator must be a single character');

      return terminator.charCodeAt(0);
    } else {
      return undefined;
    }
  }
}

export abstract class Bits extends DataType {

  private _size: number;

  constructor(options?: any) {
    super(options);
    this._size = options.size;
  }

  execute(buffer: PosBuffer): string | number | boolean {
    const bytesToRead = Math.ceil((buffer.offset.bits + this._size) / 8);
    const value = buffer.buffer.readUIntBE(buffer.offset.bytes, bytesToRead);

    const bitsRead = bytesToRead * 8;
    const bitMask = ((2 ** this._size) - 1);
    const result = ((value >> (bitsRead - this._size - buffer.offset.bits)) & bitMask);

    return result;
  }

  get size() {
    return this._size;
  }
}

export class Bool extends Bits {
  constructor(options?: any) {
    super({...options, size: 1} )
  }

  execute(buffer: PosBuffer): string | number | boolean {
    const value = super.execute(buffer);
    return value === 1;
  }
}

export class Bit extends Bits {
  constructor(options?: any) {
    super({...options, size: 1} )
  }
}

export class Bits2 extends Bits {
  constructor(options?: any) {
    super({...options, size: 2} )
  }
}

export class Bits3 extends Bits {
  constructor(options?: any) {
    super({...options, size: 3} )
  }
}

export class Bits4 extends Bits {
  constructor(options?: any) {
    super({...options, size: 4} )
  }
}

export class Bits5 extends Bits {
  constructor(options?: any) {
    super({...options, size: 5} )
  }
}

export class Bits6 extends Bits {
  constructor(options?: any) {
    super({...options, size: 6} )
  }
}

export class Bits7 extends Bits {
  constructor(options?: any) {
    super({...options, size: 7} )
  }
}

export class Bits8 extends Bits {
  constructor(options?: any) {
    super({...options, size: 8} )
  }
}

export class Bits9 extends Bits {
  constructor(options?: any) {
    super({...options, size: 9} )
  }
}

export class Bits10 extends Bits {
  constructor(options?: any) {
    super({...options, size: 10} )
  }
}

export class Bits11 extends Bits {
  constructor(options?: any) {
    super({...options, size: 11} )
  }
}

export class Bits12 extends Bits {
  constructor(options?: any) {
    super({...options, size: 12} )
  }
}

export class Bits13 extends Bits {
  constructor(options?: any) {
    super({...options, size: 13} )
  }
}

export class Bits14 extends Bits {
  constructor(options?: any) {
    super({...options, size: 14} )
  }
}

export class Bits15 extends Bits {
  constructor(options?: any) {
    super({...options, size: 15} )
  }
}

export class Bits16 extends Bits {
  constructor(options?: any) {
    super({...options, size: 16} )
  }
}