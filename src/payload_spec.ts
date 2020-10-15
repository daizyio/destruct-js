import { Instruction, Primitive, Value, Literal, Calculation, SkipInstruction, IfInstruction, LookupInstruction, PadInstruction, EndiannessInstruction, ValueProducer, Predicate, ValueProvider } from './instructions';
import { PosBuffer, DataTypeCtor, Encoding, Mode, NumericTypeCtor } from './pos_buffer';

export class PayloadSpec {

  private instructions: Instruction<any>[] = [];

  constructor(private mode: Mode = Mode.BE) {}

  public field(name: string, Type: DataTypeCtor | Primitive, options?: FieldOptions): PayloadSpec {
    if (typeof Type === 'function') {
      this.instructions.push(new Value(name, Type, options));
    } else {
      this.instructions.push(new Literal(name, { value: Type }))
    }
    return this;
  }

  public store(name: string, Type: DataTypeCtor | Primitive, options?: FieldOptions): PayloadSpec {
    if (typeof Type === 'function') {
      this.instructions.push(new Value(name, Type, { store: true, ...options }));
    } else {
      this.instructions.push(new Literal(name, { value: Type, store: true, ...options }))
    }

    return this;
  }

  public derive(name: string, callback: (r: any) => number | string): PayloadSpec {
    this.instructions.push(new Calculation(name, callback));
    return this;
  }

  public skip(sizable: number | NumericTypeCtor): PayloadSpec {
    const skipBytes: number = (typeof sizable === 'number') ? sizable : Math.floor(new sizable().bitSize() / 8);
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

  public exec(data: Buffer | PosBuffer): any {
    const posBuffer = data instanceof PosBuffer ? data : new PosBuffer(data, { endianness: this.mode });

    const reader = new BufferReader(posBuffer, this.mode, this.instructions);
  
    return reader.read();
  }
}

export interface FieldOptions {
  terminator?: string | number;
  dp?: number;
  then?: (v: any) => Primitive;
  shouldBe?: Primitive;
  size?: number;
  encoding?: Encoding; 
  value?: Primitive;
  store?: boolean;
}

export type ReaderState = { result: any, storedVars: any, offset: { bytes: number, bits: number }, mode: Mode};

class BufferReader {
  constructor(private posBuffer: PosBuffer, private _mode: Mode = Mode.BE, private instructions: Instruction<any>[]) {
  }
  
  public read(): any {
    const result: any = {};
    const storedVars: any = {};

    for(const instruction of this.instructions) {
      const readerState = { result, storedVars, mode: this._mode, offset: this.posBuffer.offset }
      if (instruction instanceof ValueProducer) {
        const value = instruction.execute(this.posBuffer, readerState);

        if (instruction.name) {
          if (instruction.options?.store) {
            storedVars[instruction.name] = value;
          } else {
            result[instruction.name] = value;
          }
        }
      } else {
        instruction.execute(this.posBuffer, readerState);
      }
    }

    return result;
  }
}

export class ParsingError extends Error {

}