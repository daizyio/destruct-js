import { PosBuffer, ReaderState, FieldOptions, DataTypeCtor, Mode, Spec } from '..';
import { TypeOptions } from '../pos_buffer/pos_buffer';

export type Predicate = (r: any) => boolean;
export type ValueProvider = (r: any) => Primitive;
export type Primitive = number | string | boolean | Buffer;

export interface Instruction<T> {
  execute(buffer: PosBuffer, readerState: ReaderState): T | undefined;
  write(buffer: PosBuffer, readerState: ReaderState): void;
}
// ======
export abstract class ValueProducer implements Instruction<Primitive | Array<any>> {
  constructor(public options: FieldOptions | undefined) {
    this.options = options;
  }

  abstract execute(buffer: PosBuffer, readerState: ReaderState): Primitive | Array<any> | undefined;
  abstract write(buffer: PosBuffer, readerState: ReaderState): void;
}
// ======
export abstract class NamedValueProducer extends ValueProducer {
  constructor(protected _name: string, public options: FieldOptions | undefined) {
    super(options)
  }

  abstract execute(buffer: PosBuffer, readerState: ReaderState): Primitive | Array<any> | undefined;
  public write(buffer: PosBuffer, readerState: ReaderState): void {}

  protected resolveOptions(readerState: ReaderState): TypeOptions | undefined {
    if (!this.options) return undefined;

    const combinedState = { ...readerState.result, ...readerState.storedVars};

    return {
      size: this.resolveOption(this.options.size, combinedState),
      terminator: this.options.terminator,
      dp: this.options.dp,
      encoding: this.options.encoding,
      then: this.options.then,
      before: this.options.before,
      mode: this.options.mode
    };

  }

  private resolveOption(value: any, combinedState: any): any {
    if (value === null || typeof value === 'undefined') {
      return undefined;
    }

    return (typeof value === 'function') ? value(combinedState) : value;
  }

  get name() {
    return this._name;
  }
}

// ======  VALUE PRODUCERS ====

export class Value extends NamedValueProducer {
  private _shouldBe: Primitive | null;

  constructor(_name: string, private Type: DataTypeCtor, options: FieldOptions | undefined) {
    super(_name, options);
    this._shouldBe = options?.shouldBe ?? null;
  }

  execute(buffer: PosBuffer, readerState: ReaderState): Primitive | undefined {
    const value = buffer.read(this.Type, this.resolveOptions(readerState));
    this.check(value);

    return value;
  }

  write(buffer: PosBuffer, readerState: ReaderState): void {
    const value = readerState.result[this._name];
    this.check(value);

    buffer.write(this.Type, value, this.resolveOptions(readerState));
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
  constructor(private predicate: Predicate, private otherSpec: Spec) {
    super({});
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    const shouldExec = this.predicate({ ...readerState.result, ...readerState.storedVars });

    if (shouldExec) {
      return this.otherSpec.exec(buffer, readerState);
    }
  }

  public write(buffer: PosBuffer, readerState: ReaderState): void {
    const shouldExec = this.predicate({ ...readerState.result, ...readerState.storedVars });

    if (shouldExec) {
      this.otherSpec.write(readerState.result, buffer);
    }
  }
}
// ======
export class LookupInstruction extends ValueProducer {
  constructor(private valueProvider: ValueProvider, private valueMap: {[k:string]: Spec}) {
    super({});
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    const value = this.valueProvider({ ...readerState.result, ...readerState.storedVars });

    if (value == null) return;

    const otherSpec = this.valueMap[value.toString()] ?? this.valueMap['default'];

    if (otherSpec) {
      return otherSpec.exec(buffer);
    } else {
      throw new Error(`Invalid value for switch: ${value}`);
    }
  }

  public write(buffer: PosBuffer, readerState: ReaderState): void {
    const value = this.valueProvider({ ...readerState.result, ...readerState.storedVars });

    if (value == null) return;

    const otherSpec = this.valueMap[value.toString()] ?? this.valueMap['default'];

    if (otherSpec) {
      otherSpec.write(readerState.result, buffer);
    }
  }
}
// ======
export class LoopInstruction extends NamedValueProducer {
  constructor(_name: string, private repeat: number | ((r: any) => number) | null, private loopSpec: Spec) {
    super(_name, {});
  }

  public execute(buffer: PosBuffer, readerState: ReaderState): Array<any> {
    const repetitions = typeof this.repeat === 'number' ? this.repeat : typeof this.repeat === 'function' ? this.repeat({ ...readerState.result, ...readerState.storedVars }) : Number.MAX_SAFE_INTEGER;

    if (typeof repetitions !== 'number' || !Number.isInteger(repetitions)) {
      throw new Error('Loop count must be an integer');
    }

    const result = [];
    for (let i = 0; i < repetitions && !buffer.finished; i++) {
      const tempState = JSON.parse(JSON.stringify(readerState));
      result.push(this.loopSpec.exec(buffer, tempState));
    };

    return result;
  }

  public write(buffer: PosBuffer, readerState: ReaderState): void {
    const repetitions = typeof this.repeat === 'number' ? this.repeat : typeof this.repeat === 'function' ? this.repeat({ ...readerState.result, ...readerState.storedVars }) : Number.MAX_SAFE_INTEGER;

    if (typeof repetitions !== 'number' || !Number.isInteger(repetitions)) {
      throw new Error('Loop count must be an integer');
    }

    for (let i = 0; i < repetitions; i++) {
      const value: any = readerState.result[this._name];
      const nextContext = Array.isArray(value) ? value[i] : value;

      if (!nextContext) return;

      const tempState = JSON.parse(JSON.stringify(nextContext));
      this.loopSpec.write(tempState, buffer)
    }
  }

  get name() {
    return this._name;
  }
}
// =======
export class IncludeInstruction extends ValueProducer {
  constructor(private includedSpec: Spec) {
    super({});
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    return this.includedSpec.read(buffer, readerState);
  }

  public write(buffer: PosBuffer, readerState: ReaderState): void {
    this.includedSpec.write(readerState.result, buffer);
  }
}
// =======
export class GroupInstruction extends NamedValueProducer {
  constructor(_name: string, private includedSpec: Spec) {
    super(_name, {});
  }

  public execute(buffer: PosBuffer, readerState: ReaderState) {
    return this.includedSpec.read(buffer, readerState);
  }

  public write(buffer: PosBuffer, readerState: ReaderState): void {
    this.includedSpec.write(readerState.result, buffer);
  }
}

// ======= NULL INSTRUCTIONS ==============

abstract class NullInstruction implements Instruction<void> {
  abstract execute(buffer: PosBuffer, readerState: ReaderState): void
  write(buffer: PosBuffer, readerState: ReaderState): void {
    this.execute(buffer, readerState);
  }
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