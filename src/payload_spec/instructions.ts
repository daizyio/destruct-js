import { PosBuffer, ReaderState, FieldOptions, DataTypeCtor, Mode, PayloadSpec } from '..';

export type Predicate = (r: any) => boolean;
export type ValueProvider = (r: any) => Primitive;
export type Primitive = number | string | boolean;

export interface Instruction<T> {
  execute(buffer: PosBuffer, readerState: ReaderState): T | undefined;
}
// ======
export abstract class ValueProducer implements Instruction<Primitive | Array<any>> {
  constructor(public options: FieldOptions | undefined) {
    this.options = options;
  }

  abstract execute(buffer: PosBuffer, readerState: ReaderState): Primitive | Array<any> | undefined;
  abstract write(buffer: PosBuffer, value: Primitive): void;
}
// ======
export abstract class NamedValueProducer extends ValueProducer {
  constructor(protected _name: string, public options: FieldOptions | undefined) {
    super(options)
  }

  abstract execute(buffer: PosBuffer, readerState: ReaderState): Primitive | Array<any> | undefined;
  public write(buffer: PosBuffer, value: Primitive): void {}

  get name() {
    return this._name;
  }
}

// ======  VALUE PRODUCERS ====

export class Value extends NamedValueProducer {
  private _shouldBe: string | number | boolean | null;

  constructor(_name: string, private Type: DataTypeCtor, options: FieldOptions | undefined) {
    super(_name, options);
    this._shouldBe = options?.shouldBe ?? null;
  }

  execute(buffer: PosBuffer, readerState: ReaderState): Primitive | undefined {
    const value = buffer.read(this.Type, this.options);
    this.check(value);
    
    return value;
  }

  write(buffer: PosBuffer, value: Primitive): void {
    buffer.write(this.Type, value);
  }

  public check(value: any): void {
    if (this._shouldBe != null && value != this._shouldBe) {
      throw new Error(`Expected ${this.name} to be ${this._shouldBe} but was ${value}`);
    }
  }
}
// ======
export class Calculation extends NamedValueProducer {

  constructor(_name: string, private callback: ValueProvider) {
    super(_name, { store: false });
  }

  public execute(buffer: PosBuffer, readerState: ReaderState): Primitive {
    const combinedVars = { ...readerState.result, ...readerState.storedVars }
    return this.callback(combinedVars);
  }
}
// ======
export class Literal extends NamedValueProducer {
  private value: Primitive | undefined;

  constructor(name: string, options?: FieldOptions) {
    super(name, options);
    this.value = options?.value;
  }

  execute(buffer: PosBuffer, readerState: ReaderState): Primitive {
    return this.value!;
  }
}
// ======
export class IfInstruction extends ValueProducer {
  constructor(private predicate: Predicate, private otherSpec: PayloadSpec) {
    super({});
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    const shouldExec = this.predicate({ ...readerState.result, ...readerState.storedVars });

    if (shouldExec) {
      return this.otherSpec.exec(buffer, readerState);
    }
  }

  public write(buffer: PosBuffer, value: Primitive): void {}
}
// ======
export class LookupInstruction extends ValueProducer {
  constructor(private valueProvider: ValueProvider, private valueMap: {[k:string]: PayloadSpec}) {
    super({});
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    const value = this.valueProvider({ ...readerState.result, ...readerState.storedVars });

    if (value == null) return;

    const otherSpec = this.valueMap[value.toString()] ?? this.valueMap['default'];

    if (otherSpec) {
      return otherSpec.exec(buffer);
    }
  }
  
  public write(buffer: PosBuffer, value: Primitive): void {}
}
// ======
export class LoopInstruction extends NamedValueProducer {
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

// ======= NULL INSTRUCTIONS ==============

abstract class NullInstruction implements Instruction<void> {
  abstract execute(buffer: PosBuffer, readerState: ReaderState): void
}
// ======
export class SkipInstruction extends NullInstruction {

  constructor(private bytes: number) {
    super();
  }

  public execute(buffer: PosBuffer, reader: ReaderState): void {
    buffer.skip(this.bytes);
  }
}
// ======
export class EndiannessInstruction extends NullInstruction {
  constructor(public mode: Mode) {
    super();
  }

  public execute(buffer: PosBuffer, readerState: ReaderState): void {
    buffer.mode = this.mode;
  }
}
// ======
export class PadInstruction extends NullInstruction {

  public execute(buffer: PosBuffer, readerState: ReaderState): void {
    buffer.pad();
  }
}
// ======
export class TapInstruction extends NullInstruction {
  constructor(private callback: (buffer: PosBuffer, readerState: ReaderState) => void) {
   super(); 
  }

  public execute(buffer: PosBuffer, readerState: ReaderState): void {
    this.callback(buffer, readerState);
  }
}