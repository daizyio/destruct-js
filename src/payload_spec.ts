import { NumericDataType } from './types';

export class PayloadSpec {

  private instructions: [string | null, Instruction][] = [];

  constructor(private mode: Mode = Mode.BE) {}

  public field(name: string, Type: new (options?: any) => Instruction, options?: any): PayloadSpec {
    this.instructions.push([name, new Type(options)]);
    return this;
  }

  public skip(sizable: number | (new () => NumericDataType)): PayloadSpec {
    const skipBytes: number = (typeof sizable === 'number') ? sizable : Math.floor(new sizable().bitSize() / 8);
    this.instructions.push([null, new SkipInstruction(skipBytes)])
    return this;
  }

  public endianness(mode: Mode): PayloadSpec {
    this.instructions.push([null, new EndiannessInstruction(mode)]);
    return this;
  }

  public exec(data: Buffer): any {
    const reader = new BufferReader(data, this.mode);
    const result: any = {};
    for(const instruction of this.instructions) {
      const value = reader.read(instruction[1]);
      if (instruction[0]) {
        const fieldName = instruction[0] as string;
        result[fieldName] = value;
      }
    }

    return result;
  }
}

export interface Instruction {
  get(buffer: Buffer, offset: number, mode?: Mode): any;
  readonly size: number;
}

class NumberField implements Instruction {
  constructor(private type: NumericDataType) {}

  public get(buffer: Buffer, offset: number, mode: Mode = Mode.BE): number {
    return this.type.get(buffer, offset, mode);
  }

  get size() {
    return Math.floor(this.type.bitSize() / 8);
  }
}

class NullInstruction implements Instruction {
  public get(buffer: Buffer, offset: number, mode?: Mode): any {
    return null;
  }

  get size() {
    return 0;
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

  constructor(private buffer: Buffer, private mode: Mode = Mode.BE) {}

  public read(instruction: Instruction): number | string | null {
    if (instruction instanceof EndiannessInstruction) {
      this.mode = instruction.mode;
      return null;
    }

    const value = instruction.get(this.buffer, this.byteOffset, this.mode);

    this.byteOffset += instruction.size;
    return value;
  }
}