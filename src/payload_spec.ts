import { NumericDataType } from './types';

export class PayloadSpec {

  private instructions: Instruction[] = [];

  constructor(private mode: Mode = Mode.BE) {}

  public field(name: string, Type: new (name: string | null, options?: any) => Instruction, options?: any): PayloadSpec {
    this.instructions.push(new Type(name, options));
    return this;
  }

  public fetch(name: string, Type: new (name: string | null, options?: any) => Instruction, options?: any): PayloadSpec {
    this.instructions.push(new Ignorable(new Type(name, options)));
    return this;
  }

  public skip(sizable: number | (new () => NumericDataType)): PayloadSpec {
    const skipBytes: number = (typeof sizable === 'number') ? sizable : Math.floor(new sizable().bitSize() / 8);
    this.instructions.push(new SkipInstruction(skipBytes))
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

export type ReaderState = { result: any, offset: number, mode: Mode};

export interface Instruction {
  get(buffer: Buffer, readerState: ReaderState): any;
  readonly size: number;
  readonly name: string | null;
}

class Ignorable implements Instruction {
  constructor(private inst: Instruction) {}

  get(buffer: Buffer, readerState: ReaderState) {
    return this.inst.get(buffer, readerState);
  }

  get size(): number {
    return this.inst.size;
  }

  get name(): string | null {
    return this.inst.name;
  }
}

class NullInstruction implements Instruction {
  public get(buffer: Buffer, readerState: ReaderState): any {
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
    return this.bytes;
  }
}

class EndiannessInstruction extends NullInstruction {
  constructor(public mode: Mode) {
    super();
  }
}

export enum Mode {
  BE,
  LE
}

class BufferReader {
  private byteOffset: number = 0;
  
  constructor(private _mode: Mode = Mode.BE, private instructions: Instruction[]) {}
  
  public read(buffer: Buffer): any {
    const result: any = {};

    for(const instruction of this.instructions) {
      if (instruction instanceof EndiannessInstruction) {
        this._mode = instruction.mode;
        continue;
      }

      const readerState = { result, mode: this._mode, offset: this.byteOffset }
      const value = instruction.get(buffer, readerState);
      if (instruction.name) {
        result[instruction.name] = value;
      }
      this.byteOffset += instruction.size;
    }

    return result;
  }
}