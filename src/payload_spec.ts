import { Encoding } from './pos_buffer';
import { NumericDataType, Literal } from './types';

type InstructionCtor =  new (name: string | null, options?: any) => Instruction;
type NumericInstructionCtor = (new (name: string | null) => NumericDataType);
type Predicate = (r: any) => boolean;
type ValueProvider = (r: any) => Primitive | null;
export type Primitive = number | string | boolean;

export class PayloadSpec {

  private instructions: Instruction[] = [];

  constructor(private mode: Mode = Mode.BE) {}

  public field(name: string, Type: InstructionCtor | Primitive, options?: FieldOptions): PayloadSpec {
    if (typeof Type === 'function') {
      this.instructions.push(new Type(name, options));
    } else {
      this.instructions.push(new Literal(name, Type))
    }
    return this;
  }

  public store(name: string, Type: InstructionCtor | Primitive, options?: FieldOptions): PayloadSpec {
    const wrappedInstruction = typeof Type === 'function' ?
                                  new Type(name, options) 
                                : new Literal(name, Type)
    this.instructions.push(new Ignorable(wrappedInstruction));
    return this;
  }

  public derive(name: string, callback: (r: any) => number | string | null): PayloadSpec {
    this.instructions.push(new DeriveInstruction(name, callback));
    return this;
  }

  public skip(sizable: number | NumericInstructionCtor): PayloadSpec {
    const skipBytes: number = (typeof sizable === 'number') ? sizable : Math.floor(new sizable(null).bitSize() / 8);
    this.instructions.push(new SkipInstruction(skipBytes))
    return this;
  }

  public if(predicate: Predicate, otherSpec: PayloadSpec): PayloadSpec {
    this.instructions.push(new IfInstruction(predicate, otherSpec));
    return this;
  }

  
  public switch(valueProvider: ValueProvider, valueMap: {[k: string]: PayloadSpec}) {
    this.instructions.push(new LookupInstruction(valueProvider, valueMap));
    return this;
  }

  public pad(): PayloadSpec {
    this.instructions.push(new PadInstruction());
    return this;
  }

  public endianness(mode: Mode): PayloadSpec {
    this.instructions.push(new EndiannessInstruction(mode));
    return this;
  }

  public exec(data: Buffer, initialState?: ReaderState): any {
    const reader = new BufferReader(this.mode, this.instructions, initialState);
  
    return reader.read(data);
  }
}

export interface FieldOptions {
  terminator?: string | number;
  dp?: number;
  then?: (v: any) => Primitive;
  shouldBe?: Primitive;
  size?: number;
  encoding?: Encoding; 
}

export type ReaderState = { result: any, storedVars: any, offset: { bytes: number, bits: number }, mode: Mode};

export interface Instruction {
  execute(buffer: Buffer, readerState: ReaderState): any;
  readonly size: number;
  readonly name: string | null;
}

class Ignorable implements Instruction {
  constructor(private inst: Instruction) {}

  execute(buffer: Buffer, readerState: ReaderState) {
    this.inst.execute(buffer, readerState);
    const name = this.inst.name;
    if (name) {
      const value = readerState.result[name];
      delete readerState.result[name];
      readerState.storedVars[name] = value;
    }
    return 
  }

  get size(): number {
    return this.inst.size;
  }

  get name(): string | null {
    return this.inst.name;
  }
}

class NullInstruction implements Instruction {
  public execute(buffer: Buffer, readerState: ReaderState): any {
    return null;
  }

  get size() {
    return 0;
  }

  get name(): string | null {
    return null;
  }
}

class SkipInstruction extends NullInstruction {

  constructor(private bytes: number) {
    super();
  }

  get size() {
    return this.bytes * 8;
  }
}

class EndiannessInstruction extends NullInstruction {
  constructor(public mode: Mode) {
    super();
  }
}

class PadInstruction extends NullInstruction {
  private _size: number = 0;

  public execute(buffer: Buffer, readerState: ReaderState): any {
    const bitsToPad = 8 - readerState.offset.bits;
    this._size = bitsToPad;
    return null;
  }

  get size() {
    return this._size;
  }
}

class DeriveInstruction implements Instruction {
  constructor(private _name: string, private callback: ValueProvider) {}

  public execute(buffer: Buffer, readerState: ReaderState) {
    const combinedVars = { ...readerState.result, ...readerState.storedVars }
    const value = this.callback(combinedVars);
    readerState.result[this._name] = value;
    return value;
  }

  get name() {
    return this._name;
  }

  get size() {
    return 0;
  }
}

class IfInstruction extends NullInstruction {
  constructor(private predicate: Predicate, private otherSpec: PayloadSpec) {
    super();
  }

  public execute(buffer: Buffer, readerState: ReaderState) {
    const shouldExec = this.predicate({ ...readerState.result, ...readerState.storedVars });

    if (shouldExec) {
      const subResult = this.otherSpec.exec(buffer, readerState);
      Object.assign(readerState.result, subResult);
    }
  }
}

class LookupInstruction extends NullInstruction {
  constructor(private valueProvider: ValueProvider, private valueMap: {[k:string]: PayloadSpec}) {
    super();
  }

  public execute(buffer: Buffer, readerState: ReaderState) {
    const value = this.valueProvider({ ...readerState.result, ...readerState.storedVars });

    if (value == null) return;

    const otherSpec = this.valueMap[value.toString()] ?? this.valueMap['default'];

    if (otherSpec) {
      const subResult = otherSpec.exec(buffer, readerState);
      Object.assign(readerState.result, subResult);
    }
  }
}

export enum Mode {
  BE,
  LE
}

class BufferReader {
  private byteOffset: number = 0;
  private bitOffset: number = 0;

  constructor(private _mode: Mode = Mode.BE, private instructions: Instruction[], initialState?: ReaderState) {
    this.byteOffset = initialState?.offset?.bytes || 0;
    this.bitOffset = initialState?.offset?.bits || 0;
  }
  
  public read(buffer: Buffer): any {
    const result: any = {};
    const storedVars: any = {};

    for(const instruction of this.instructions) {
      console.debug(`Executing instruction ${instruction.constructor.name} at position [${this.byteOffset}, ${this.bitOffset}]`)
      
      if (instruction instanceof EndiannessInstruction) {
        this._mode = instruction.mode;
        continue;
      }
      
      if (this.byteOffset >= buffer.length && instruction.size > 0) {
        throw new ParsingError('Reached end of buffer');
      }

      const readerState = { result, storedVars, mode: this._mode, offset: { bytes: this.byteOffset, bits: this.bitOffset } }
      instruction.execute(buffer, readerState);
      this.addOffset(instruction.size);
    }

    return result;
  }

  private addOffset(bitSize: number) {
    const currentOffsetInBits = (this.byteOffset * 8) + this.bitOffset;
    const updatedOffsetInBits = currentOffsetInBits + bitSize;
    this.byteOffset = Math.floor(updatedOffsetInBits / 8);
    this.bitOffset = updatedOffsetInBits % 8;
  }
}

export class ParsingError extends Error {

}