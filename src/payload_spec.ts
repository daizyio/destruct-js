import { Instruction, Primitive, Value, Literal, Calculation, SkipInstruction, IfInstruction, LookupInstruction, PadInstruction, EndiannessInstruction, ValueProducer, Predicate, ValueProvider, LoopInstruction } from './instructions';
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

  public loop(name: string, repeat: number | ((r: any) => number), loopSpec: PayloadSpec) {
    this.instructions.push(new LoopInstruction(name, repeat, loopSpec));
    return this;
  }

  public exec(data: Buffer | PosBuffer, initialState?: ReaderState): any {
    const posBuffer = data instanceof PosBuffer ? data : new PosBuffer(data, { endianness: this.mode });

    const reader = new BufferReader(posBuffer, this.instructions);
  
    return reader.read(initialState);
  }
}

class BufferReader {
  constructor(private posBuffer: PosBuffer, private instructions: Instruction<any>[]) {
  }
  
  public read(state: ReaderState = { result: {}, storedVars: {} }): any {
    for(const instruction of this.instructions) {
      if (instruction instanceof ValueProducer) {
        const value = instruction.execute(this.posBuffer, state);

        if (instruction.name) {
          if (instruction.options?.store) {
            state.storedVars[instruction.name] = value;
          } else {
            state.result[instruction.name] = value;
          }
        }
      } else {
        instruction.execute(this.posBuffer, state);
      }
    } 

    return state.result;
  }
}

export class ParsingError extends Error {

}