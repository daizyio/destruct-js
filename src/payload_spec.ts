import { NumericDataType } from './types';

export class PayloadSpec {

  private instructions: Instruction[] = [];

  constructor(private mode: Mode = Mode.BE) {}

  public field(name: string, Type: new (name: string | null, options?: any) => Instruction, options?: any): PayloadSpec {
    this.instructions.push(new Type(name, options));
    return this;
  }

  public store(name: string, Type: new (name: string | null, options?: any) => Instruction, options?: any): PayloadSpec {
    this.instructions.push(new Ignorable(new Type(name, options)));
    return this;
  }

  public derive(name: string, callback: (r: any) => number | string | null): PayloadSpec {
    this.instructions.push(new DeriveInstruction(name, callback));
    return this;
  }

  public skip(sizable: number | (new (name: string | null) => NumericDataType)): PayloadSpec {
    const skipBytes: number = (typeof sizable === 'number') ? sizable : Math.floor(new sizable(null).bitSize() / 8);
    this.instructions.push(new SkipInstruction(skipBytes))
    return this;
  }

  public if(conditional: (r: any) => boolean, otherSpec: PayloadSpec): PayloadSpec {
    this.instructions.push(new IfInstruction(conditional, otherSpec));
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

  public exec(data: Buffer): any {
    const reader = new BufferReader(this.mode, this.instructions);
  
    return reader.read(data);
  }
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
  constructor(private _name: string, private callback: (r: any) => number | string | null) {}

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
  constructor(private conditional: (r: any) => boolean, private otherSpec: PayloadSpec) {
    super();
  }

  public execute(buffer: Buffer, readerState: ReaderState) {
    const shouldExec = this.conditional({ ...readerState.result, ...readerState.storedVars });

    if (shouldExec) {
      const subResult = this.otherSpec.exec(buffer.slice(readerState.offset.bytes));
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

  constructor(private _mode: Mode = Mode.BE, private instructions: Instruction[]) {}
  
  public read(buffer: Buffer): any {
    const result: any = {};
    const storedVars: any = {};

    for(const instruction of this.instructions) {
      if (instruction instanceof EndiannessInstruction) {
        this._mode = instruction.mode;
        continue;
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