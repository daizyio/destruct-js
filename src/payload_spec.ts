import { PosBuffer, DataTypeCtor, Encoding, Mode, NumericTypeCtor } from './pos_buffer';

type Predicate = (r: any) => boolean;
type ValueProvider = (r: any) => Primitive;
export type Primitive = number | string | boolean;

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

  public exec(data: Buffer | PosBuffer, initialState?: ReaderState): any {
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

export interface Instruction<T> {
  execute(buffer: PosBuffer, readerState: ReaderState): T;
}

export abstract class ValueProducer implements Instruction<Primitive> {
  constructor(protected _name: string, public options: FieldOptions | undefined) {
    this.options = options;
  }

  abstract execute(buffer: PosBuffer, readerState: ReaderState): Primitive;
  abstract readonly name: string | null;
}

export class Value extends ValueProducer {
  private _then: ((value: Primitive) => Primitive) | undefined;
  private _shouldBe: string | number | boolean | null;

  constructor(_name: string, private Type: DataTypeCtor, options: FieldOptions | undefined) {
    super(_name, options);
    this._then = options?.then;
    this._shouldBe = options?.shouldBe ?? null;
  }

  execute(buffer: PosBuffer, readerState: ReaderState): Primitive {
    const value = buffer.read(this.Type, this.options);
    this.check(value);
    
    return value;
  }

  public check(value: any): void {
    if (this._shouldBe != null && value != this._shouldBe) {
      throw new ParsingError(`Expected ${this.name} to be ${this._shouldBe} but was ${value}`);
    }
  }

  get name() {
    return this._name;
  }
}

class Calculation extends ValueProducer {

  constructor(_name: string, private callback: ValueProvider) {
    super(_name, { store: false });
  }

  public execute(buffer: PosBuffer, readerState: ReaderState): Primitive {
    const combinedVars = { ...readerState.result, ...readerState.storedVars }
    return this.callback(combinedVars);
  }

  get name() {
    return this._name;
  }
}

class Literal extends ValueProducer {
  private value: Primitive | undefined;

  constructor(name: string, options?: FieldOptions) {
    super(name, options);
    this.value = options?.value;
  }

  execute(buffer: PosBuffer, readerState: ReaderState): Primitive {
    return this.value!;
  }

  get name() {
    return this._name;
  }
}

class NullInstruction implements Instruction<void> {
  public execute(buffer: PosBuffer, readerState: ReaderState): void {
  }

  get name(): string | null {
    return null;
  }
}

class SkipInstruction extends NullInstruction {

  constructor(private bytes: number) {
    super();
  }

  public execute(buffer: PosBuffer, reader: ReaderState): void {
    buffer.skip(this.bytes);
  }
}

class EndiannessInstruction extends NullInstruction {
  constructor(public mode: Mode) {
    super();
  }

  public execute(buffer: PosBuffer, readerState: ReaderState): void {
    buffer.mode = this.mode;
  }
}

class PadInstruction extends NullInstruction {

  public execute(buffer: PosBuffer, readerState: ReaderState): void {
    buffer.pad();
  }
}

class IfInstruction extends NullInstruction {
  constructor(private predicate: Predicate, private otherSpec: PayloadSpec) {
    super();
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    const shouldExec = this.predicate({ ...readerState.result, ...readerState.storedVars });

    if (shouldExec) {
      const subResult = this.otherSpec.exec(buffer, { ...readerState, offset: buffer.offset });
      Object.assign(readerState.result, subResult);
    }
  }
}

class LookupInstruction extends NullInstruction {
  constructor(private valueProvider: ValueProvider, private valueMap: {[k:string]: PayloadSpec}) {
    super();
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    const value = this.valueProvider({ ...readerState.result, ...readerState.storedVars });

    if (value == null) return;

    const otherSpec = this.valueMap[value.toString()] ?? this.valueMap['default'];

    if (otherSpec) {
      const subResult = otherSpec.exec(buffer, readerState);
      Object.assign(readerState.result, subResult);
    }
  }
}

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