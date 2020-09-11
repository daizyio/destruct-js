import { Mode, Instruction, ReaderState, ParsingError, FieldOptions, Primitive, Encoding } from './payload_spec';

abstract class ThenableInstruction implements Instruction {
  private _then: ((value: Primitive) => Primitive) | undefined;
  private _shouldBe: string | number | boolean | null;

  constructor(private _name: string | null, options?: FieldOptions) {
    this._then = options?.then;
    this._shouldBe = options?.shouldBe ?? null;
  }

  abstract execute(buffer: Buffer, readerState: ReaderState): number | string | boolean;
  abstract size: number;
  
  get name() {
    return this._name;
  }

  public then(value: any): any {
    const thennedValue = this._then ? this._then(value) : value;
    return thennedValue;
  }

  protected check(value: any): void {
    if (this._shouldBe != null && value != this._shouldBe) {
      throw new ParsingError(`Expected ${this.name} to be ${this._shouldBe} but was ${value}`);
    }
  }
}

export abstract class NumericDataType extends ThenableInstruction {
  abstract be: (offset: number) => any;
  abstract le: (offset: number) => any;
  abstract bitSize: () => number;

  public execute(buffer: Buffer, readerState: ReaderState): number {
    this.assertAtByteBoundary(readerState);
    const valueFunction = (readerState.mode === Mode.BE) ? this.be : this.le;
    const boundFunction = valueFunction.bind(buffer);
    const value = boundFunction(readerState.offset.bytes);
    const thennedValue = this.then(value);
    this.check(thennedValue);
    if (this.name) {
      readerState.result[this.name] = thennedValue;
    }
    return thennedValue;
  }

  private assertAtByteBoundary(readerState: ReaderState): void {
    if (readerState.offset.bits !== 0) {
      throw new ParsingError(`Buffer position is not at a byte boundary (bit offset ${readerState.offset.bits}). Do you need to use pad()?`)
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
    const startingBuffer = buffer.slice(readerState.offset.bytes);
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
    this.check(value);
    if (this.name) {
      readerState.result[this.name] = value;
    }

    return value;
  }

  get size() {
    return this._size * 8;
  }
}

export abstract class Bits extends ThenableInstruction {

  private _size: number;

  constructor(name: string | null, options?: any) {
    super(name, options);
    this._size = options.size;
  }

  execute(buffer: Buffer, readerState: ReaderState): string | number | boolean {
    const bytesToRead = Math.ceil((readerState.offset.bits + this.size) / 8);
    const value = buffer.readUIntBE(readerState.offset.bytes, bytesToRead);

    const bitsRead = bytesToRead * 8;
    const bitMask = ((2 ** this.size) - 1);
    const result = ((value >> (bitsRead - this.size - readerState.offset.bits)) & bitMask);
    const thennedValue = this.then(result);
    this.check(thennedValue);
    if (this.name) {
      readerState.result[this.name] = thennedValue;
    }
    return thennedValue;
  }

  get size() {
    return this._size;
  }
}

export class Bool extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 1} )
  }

  execute(buffer: Buffer, readerState: ReaderState): string | number | boolean {
    const value = super.execute(buffer, readerState);
    const boolValue = value === 1;
    if (this.name) {
      readerState.result[this.name] = boolValue;
    }
    return boolValue;
  }

  get size() {
    return 1;
  }
}

export class Bit extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 1} )
  }
}

export class Bits2 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 2} )
  }
}

export class Bits3 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 3} )
  }
}

export class Bits4 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 4} )
  }
}

export class Bits5 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 5} )
  }
}

export class Bits6 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 6} )
  }
}

export class Bits7 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 7} )
  }
}

export class Bits8 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 8} )
  }
}

export class Bits9 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 9} )
  }
}

export class Bits10 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 10} )
  }
}

export class Bits11 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 11} )
  }
}

export class Bits12 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 12} )
  }
}

export class Bits13 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 13} )
  }
}

export class Bits14 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 14} )
  }
}

export class Bits15 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 15} )
  }
}

export class Bits16 extends Bits {
  constructor(name: string | null, options?: any) {
    super(name, {...options, size: 16} )
  }
}

export class Literal implements Instruction {
  constructor(private _name: string, private value: string | number | boolean) {}

  execute(buffer: Buffer, readerState: ReaderState) {
    readerState.result[this.name] = this.value;
  }

  get size() {
    return 0;
  }

  get name() {
    return this._name;
  }
}