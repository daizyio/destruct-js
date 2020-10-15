import { PosBuffer, ReaderState, FieldOptions, DataTypeCtor, ParsingError, Mode, PayloadSpec } from '.';

export type Predicate = (r: any) => boolean;
export type ValueProvider = (r: any) => Primitive;
export type Primitive = number | string | boolean;

export interface Instruction<T> {
  execute(buffer: PosBuffer, readerState: ReaderState): T;
}

export abstract class ValueProducer implements Instruction<Primitive | Array<any>> {
  constructor(protected _name: string, public options: FieldOptions | undefined) {
    this.options = options;
  }

  abstract execute(buffer: PosBuffer, readerState: ReaderState): Primitive | Array<any>;
  // abstract readonly name: string | null;

  get name() {
    return this._name;
  }
}

export class Value extends ValueProducer {
  private _shouldBe: string | number | boolean | null;

  constructor(_name: string, private Type: DataTypeCtor, options: FieldOptions | undefined) {
    super(_name, options);
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
}

export class Calculation extends ValueProducer {

  constructor(_name: string, private callback: ValueProvider) {
    super(_name, { store: false });
  }

  public execute(buffer: PosBuffer, readerState: ReaderState): Primitive {
    const combinedVars = { ...readerState.result, ...readerState.storedVars }
    return this.callback(combinedVars);
  }
}

export class Literal extends ValueProducer {
  private value: Primitive | undefined;

  constructor(name: string, options?: FieldOptions) {
    super(name, options);
    this.value = options?.value;
  }

  execute(buffer: PosBuffer, readerState: ReaderState): Primitive {
    return this.value!;
  }
}

abstract class NullInstruction implements Instruction<void> {
  abstract execute(buffer: PosBuffer, readerState: ReaderState): void
}

export class SkipInstruction extends NullInstruction {

  constructor(private bytes: number) {
    super();
  }

  public execute(buffer: PosBuffer, reader: ReaderState): void {
    buffer.skip(this.bytes);
  }
}

export class EndiannessInstruction extends NullInstruction {
  constructor(public mode: Mode) {
    super();
  }

  public execute(buffer: PosBuffer, readerState: ReaderState): void {
    buffer.mode = this.mode;
  }
}

export class PadInstruction extends NullInstruction {

  public execute(buffer: PosBuffer, readerState: ReaderState): void {
    buffer.pad();
  }
}

export class IfInstruction extends NullInstruction {
  constructor(private predicate: Predicate, private otherSpec: PayloadSpec) {
    super();
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    const shouldExec = this.predicate({ ...readerState.result, ...readerState.storedVars });

    if (shouldExec) {
      const subResult = this.otherSpec.exec(buffer);
      Object.assign(readerState.result, subResult);
    }
  }
}

export class LookupInstruction extends NullInstruction {
  constructor(private valueProvider: ValueProvider, private valueMap: {[k:string]: PayloadSpec}) {
    super();
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    const value = this.valueProvider({ ...readerState.result, ...readerState.storedVars });

    if (value == null) return;

    const otherSpec = this.valueMap[value.toString()] ?? this.valueMap['default'];

    if (otherSpec) {
      const subResult = otherSpec.exec(buffer);
      Object.assign(readerState.result, subResult);
    }
  }
}

export class LoopInstruction extends ValueProducer {
  constructor(_name: string, private repeat: number | ((r: any) => number), private loopSpec: PayloadSpec) {
    super(_name, {});
  }

  execute(buffer: PosBuffer, readerState: ReaderState): Array<any> {
    const repetitions = typeof this.repeat === 'number' ? this.repeat : this.repeat({ ...readerState.result, ...readerState.storedVars })

    if (typeof repetitions !== 'number' || !Number.isInteger(repetitions)) {
      throw new Error('Loop count must be an integer');
    } 

    return Array(repetitions).fill(null).map(n => {
      const tempState = JSON.parse(JSON.stringify(readerState));
      return this.loopSpec.exec(buffer, tempState)
    });
  }

  get name() {
    return this._name;
  }
}