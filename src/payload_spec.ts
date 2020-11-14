import { Instruction, Primitive, Value, Literal, Calculation, SkipInstruction, IfInstruction, LookupInstruction, PadInstruction, EndiannessInstruction, ValueProducer, Predicate, ValueProvider, LoopInstruction, NamedValueProducer, TapInstruction } from './instructions';
import { PosBuffer, DataTypeCtor, Encoding, Mode, NumericTypeCtor } from './pos_buffer';

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

export type ReaderState = { result: any, storedVars: any };

export class PayloadSpec {

  private instructions: Instruction<any>[] = [];

  constructor(private options: ParsingOptions = { lenient: false, mode: Mode.BE }) {}

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

  public loop(name: string, repeat: number | ((r: any) => number), loopSpec: PayloadSpec) {
    this.instructions.push(new LoopInstruction(name, repeat, loopSpec));
    return this;
  }

  public tap(callback: (buffer: PosBuffer, state: ReaderState) => void) {
    this.instructions.push(new TapInstruction(callback));
    return this;
  }

  public exec(data: Buffer | PosBuffer, initialState?: ReaderState): any {
    const posBuffer = data instanceof PosBuffer ? data : new PosBuffer(data, { endianness: this.options.mode, lenient: this.options.lenient });

    const reader = new BufferReader(posBuffer, this.instructions);
  
    return reader.read(initialState);
  }

  public write(data: any): Buffer {
    const posBuffer = new PosBuffer([]);

    const writer = new BufferWriter(posBuffer, this.instructions);

    return writer.write(data);
  }
}

class BufferReader {
  constructor(private posBuffer: PosBuffer, private instructions: Instruction<any>[]) {
  }
  
  public read(state: ReaderState = { result: {}, storedVars: {} }): any {
    const result: {[k:string]: any} = {};

    for(const instruction of this.instructions) {
      if (instruction instanceof ValueProducer) {
        const value = instruction.execute(this.posBuffer, state);

        if (instruction instanceof NamedValueProducer) {
          if (instruction.options?.store) {
            state.storedVars[instruction.name] = value;
          } else {
            result[instruction.name] = value;
          }
        } else {
          Object.assign(result, value);
        }
      } else {
        instruction.execute(this.posBuffer, state);
      }
      Object.assign(state.result, result);
    } 

    return result;
  }
}

class BufferWriter {
  constructor(private posBuffer: PosBuffer, private instructions: Instruction<any>[]) {
  }
  
  public write(data: any): Buffer {
    const result: {[k:string]: any} = {};

    for(const instruction of this.instructions) {
      if (instruction instanceof NamedValueProducer) {
        instruction.write(this.posBuffer, data[instruction.name]);
      } else {
        instruction.execute(this.posBuffer, { result: data, storedVars: {}});
      }
    }

    return this.posBuffer.buffer;
  }
}
export class ParsingError extends Error {

}

export interface ParsingOptions {
  mode?: Mode;
  lenient?: boolean;
}