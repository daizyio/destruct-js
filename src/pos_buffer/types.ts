import { Primitive } from '../payload_spec/instructions';
import { PosBuffer, Encoding, Mode, TypeOptions } from './pos_buffer';

export abstract class DataType {

  constructor(protected options?: TypeOptions) {}

  abstract execute(buffer: PosBuffer): Primitive;
  abstract size: number;

  public write(buffer: PosBuffer, value: Primitive): Buffer {
    return Buffer.from([]);
  }
}

export abstract class NumericDataType extends DataType {
  abstract be: (offset: number) => any;
  abstract le: (offset: number) => any;
  abstract bitSize: () => number;
  abstract writeBe: (value: number, offset: number) => number;
  abstract writeLe: (value: number, offset: number) => number;

  public execute(buffer: PosBuffer): number {
    this.assertAtByteBoundary(buffer.offset);
    const mode = this.options?.mode ?? buffer.mode;
    const valueFunction = (mode === Mode.BE) ? this.be : this.le;
    const boundFunction = valueFunction.bind(buffer.buffer);
    const value = boundFunction(buffer.offset.bytes);
    return value;
  }

  public write(buffer: PosBuffer, value: number): Buffer {
    this.assertAtByteBoundary(buffer.offset);
    const tempBuffer = Buffer.alloc(this.bitSize() / 8);
    const writeFunction = (buffer.mode === Mode.BE) ? this.writeBe : this.writeLe;
    const boundFunction = writeFunction.bind(tempBuffer);
    boundFunction(value, 0);
    return tempBuffer;
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
  public writeBe = Buffer.prototype.writeUInt8;
  public writeLe = Buffer.prototype.writeUInt8;
  public bitSize = () => 8;
}

export class Int8 extends NumericDataType {  
  public be = Buffer.prototype.readInt8;
  public le = Buffer.prototype.readInt8;
  public writeBe = Buffer.prototype.writeInt8;
  public writeLe = Buffer.prototype.writeInt8;
  public bitSize = () => 8;
}

export class UInt16 extends NumericDataType {
  public be = Buffer.prototype.readUInt16BE;
  public le = Buffer.prototype.readUInt16LE;
  public writeBe = Buffer.prototype.writeUInt16BE;
  public writeLe = Buffer.prototype.writeUInt16LE;
  public bitSize = () => 16;
}

export class Int16 extends NumericDataType {
  public be = Buffer.prototype.readInt16BE;
  public le = Buffer.prototype.readInt16LE;
  public writeBe = Buffer.prototype.writeInt16BE;
  public writeLe = Buffer.prototype.writeInt16LE;
  public bitSize = () => 16;
}

export class UInt32 extends NumericDataType {
  public be = Buffer.prototype.readUInt32BE;
  public le = Buffer.prototype.readUInt32LE;
  public writeBe = Buffer.prototype.writeUInt32BE;
  public writeLe = Buffer.prototype.writeUInt32LE;
  public bitSize = () => 32;
}

export class Int32 extends NumericDataType {
  public be = Buffer.prototype.readInt32BE;
  public le = Buffer.prototype.readInt32LE;
  public writeBe = Buffer.prototype.writeInt32BE;
  public writeLe = Buffer.prototype.writeInt32LE;
  public bitSize = () => 32;
}

export class Float extends NumericDataType {
  public be = Buffer.prototype.readFloatBE;
  public le = Buffer.prototype.readFloatLE;
  public writeBe = Buffer.prototype.writeFloatBE;
  public writeLe = Buffer.prototype.writeFloatLE;
  public bitSize = () => 32;
}

export class Double extends NumericDataType {
  public be = Buffer.prototype.readDoubleBE;
  public le = Buffer.prototype.readDoubleLE;
  public writeBe = Buffer.prototype.writeDoubleBE;
  public writeLe = Buffer.prototype.writeDoubleLE;
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

  public write(buffer: PosBuffer, value: string): Buffer {
    const substring = this._size ? value.substring(0, this._size) : value;
    const returnBuffer = Buffer.from(substring, this.encoding);

    if (typeof this.terminator !== 'undefined') {
      const terminatedBuffer = Buffer.concat([returnBuffer, Buffer.from([this.terminator])]);
      this._size = terminatedBuffer.length;
      return terminatedBuffer;
    } else {
      this._size = returnBuffer.length;
      return returnBuffer;
    }
    
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

  execute(buffer: PosBuffer): Primitive {
    const bytesToRead = Math.ceil((buffer.offset.bits + this._size) / 8);
    const value = buffer.buffer.readUIntBE(buffer.offset.bytes, bytesToRead);

    const bitsRead = bytesToRead * 8;
    const bitMask = ((2 ** this._size) - 1);
    const result = ((value >> (bitsRead - this._size - buffer.offset.bits)) & bitMask);

    return result;
  }

  public write(buffer: PosBuffer, value: number | boolean): Buffer {
    const numValue: number = typeof value === 'number' ? value : (value ? 1 : 0);
    const startPos = buffer.offset.bits;
    for (let i = 0; i < this._size; i++) {
      buffer.flipBits((startPos + i) % 8, (numValue >> (this._size - i - 1)) & 0x1);
    }    
    return Buffer.from([]);
  }

  get size() {
    return this._size;
  }
}

export class Bool extends Bits {
  constructor(options?: any) {
    super({...options, size: 1} )
  }

  execute(buffer: PosBuffer): Primitive {
    const value = super.execute(buffer);
    return value === 1;
  }

  public write(buffer: PosBuffer, value: boolean): Buffer {
    buffer.flipBits(buffer.offset.bits, value ? 1 : 0);
    return Buffer.from([]);
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