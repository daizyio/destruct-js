import { NumericDataType } from './types';

export class PayloadSpec {

  private instructions: [string | null, Instruction][] = [];

  public field(name: string, type: NumericDataType): PayloadSpec {
    this.instructions.push([name, new NumberField(type)]);
    return this;
  }

  public skip(bytes: number): PayloadSpec {
    this.instructions.push([null, new SkipInstruction(bytes)])
    return this;
  }

  public exec(data: Buffer): any {
    const reader = new BufferReader(data);
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

interface Instruction {
  get(buffer: Buffer, mode?: Mode): (offset: number) => number | string | null;
  readonly size: number;
}

class NumberField implements Instruction {
  constructor(private type: NumericDataType) {}

  public get(buffer: Buffer, mode: Mode = Mode.BE): (offset: number) => number | string {
    if (mode === Mode.BE) {
      return this.type.be(buffer);
    } else {
      return this.type.le(buffer);
    }
  }

  get size() {
    return Math.floor(this.type.bitSize() / 8);
  }
}

class SkipInstruction implements Instruction {

  constructor(private bytes: number) {}

  public get(buffer: Buffer): (offset: number) => number | string | null {
    return (offset: number) => null;
  }

  get size() {
    return this.bytes;
  }
}

enum Mode {
  BE,
  LE
}

class BufferReader {
  private byteOffset: number = 0;
  private mode: Mode = Mode.BE;

  constructor(private buffer: Buffer) {}

  public read(instruction: Instruction) {
    const extract = instruction.get(this.buffer, this.mode).bind(this.buffer);
    const value = extract(this.byteOffset);

    this.byteOffset += instruction.size;
    return value;
  }
}