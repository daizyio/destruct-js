import PosBuffer, { Encoding } from './pos_buffer';
import { NumericDataType, DataType } from './types';

type DataTypeCtor = new (options?: FieldOptions) => DataType;
type NumericTypeCtor = (new (options?: FieldOptions) => NumericDataType);
type Predicate = (r: any) => boolean;
type ValueProvider = (r: any) => Primitive;
export type Primitive = number | string | boolean;
export type InstructionSpec = [string, DataTypeCtor | Primitive, FieldOptions];

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
    this.instructions.push(new DeriveValue(name, callback));
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
  abstract readonly size: number;
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
    const thennedValue = (this._then) ? this._then(value) : value;
    this.check(thennedValue);
    
    return thennedValue;
  }

  public then(value: any): any {
    const thennedValue = this._then ? this._then(value) : value;
    return thennedValue;
  }

  public check(value: any): void {
    if (this._shouldBe != null && value != this._shouldBe) {
      throw new ParsingError(`Expected ${this.name} to be ${this._shouldBe} but was ${value}`);
    }
  }

  get size() {
    return 0;
  }

  get name() {
    return this._name;
  }
}

class DeriveValue extends ValueProducer {

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

  get size() {
    return 0;
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

  get size() {
    return 0;
  }

  get name() {
    return this._name;
  }
}

class NullInstruction implements Instruction<void> {
  public execute(buffer: PosBuffer, readerState: ReaderState): void {
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

  public execute(buffer: PosBuffer, reader: ReaderState): void {
    buffer.skip(this.bytes);
  }

  get size() {
    return this.bytes * 8;
  }
}

class EndiannessInstruction extends NullInstruction {
  constructor(public mode: Mode) {
    super();
  }

  public execute(buffer: PosBuffer, readerState: ReaderState): void {
    buffer.setEndianness(this.mode);
  }
}

class PadInstruction extends NullInstruction {
  private _size: number = 0;

  public execute(buffer: PosBuffer, readerState: ReaderState): void {
    buffer.pad();
  }

  get size() {
    return this._size;
  }
}

class IfInstruction extends NullInstruction {
  constructor(private predicate: Predicate, private otherSpec: PayloadSpec) {
    super();
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    const shouldExec = this.predicate({ ...readerState.result, ...readerState.storedVars });

    if (shouldExec) {
      const subResult = this.otherSpec.exec(buffer.buffer, { ...readerState, offset: buffer.offset });
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
      const subResult = otherSpec.exec(buffer.buffer, readerState);
      Object.assign(readerState.result, subResult);
    }
  }
}

export enum Mode {
  BE,
  LE
}

class BufferReader {
  private offset: { bytes: number, bits: number };

  constructor(private _mode: Mode = Mode.BE, private instructions: Instruction<any>[], initialState?: ReaderState) {
    this.offset = initialState?.offset || { bytes: 0, bits: 0};
  }
  
  public read(originalBuffer: Buffer): any {
    const result: any = {};
    const storedVars: any = {};

    const buffer = new PosBuffer(originalBuffer, { endianness: this._mode });
    buffer.offset = this.offset;

    for(const instruction of this.instructions) {
      const readerState = { result, storedVars, mode: this._mode, offset: buffer.offset }
      if (instruction instanceof ValueProducer) {
        const value = instruction.execute(buffer, readerState);

        if (instruction.name) {
          if (instruction.options?.store) {
            storedVars[instruction.name] = value;
          } else {
            result[instruction.name] = value;
          }
        }
      } else {
        instruction.execute(buffer, readerState);
      }
    }

    return result;
  }
}

export class ParsingError extends Error {

}