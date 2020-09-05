import { PayloadSpec, Mode } from '../payload_spec';
import { UInt8, Int8, UInt16, Float, UInt32, Text, Bit, Bool } from '../types';

describe('Simple fields', () => {
  it('reads fields in order from the buffer', () => {
    const spec = new PayloadSpec();

    spec.field('count', UInt8)
        .field('temp', UInt8)
        .field('pi', Float);

    const result = spec.exec(Buffer.from([0xFF, 0x02, 0x40, 0x49, 0x0F, 0xD0]));

    expect(result.count).toBe(255);
    expect(result.temp).toBe(2);
    expect(result.pi).toBe(3.141590118408203);
  });
});
describe('skip', () => {
  it('skips a number of bytes', () => {
    const spec = new PayloadSpec();
    
    spec.field('count', UInt8)
        .skip(1)
        .field('temp', UInt8)
        .skip(3)
        .field('humidity', UInt8);

    const result: any = spec.exec(Buffer.from([0x16, 0x00, 0x7F, 0x00, 0x00, 0x00, 0x01]));

    expect(result.count).toBe(22);
    expect(result.temp).toBe(127);
    expect(result.humidity).toBe(1);
  });

  it('skips the size of the passed data type', () => {
    const spec = new PayloadSpec();
    
    spec.field('count', UInt8)
        .skip(Int8)
        .field('temp', UInt8)
        .skip(UInt16)
        .skip(Int8)
        .field('humidity', UInt8);

    const result: any = spec.exec(Buffer.from([0x16, 0x00, 0x7F, 0x00, 0x00, 0x00, 0x01]));

    expect(result.count).toBe(22);
    expect(result.temp).toBe(127);
    expect(result.humidity).toBe(1);
  });
});

describe('endianness', () => {
  it('can switch enddianness', () => {
    const result = 
      new PayloadSpec(Mode.BE)
        .field('countBE', UInt16)
          .endianness(Mode.LE)
        .field('countLE', UInt16)
          .endianness(Mode.BE)
        .exec(Buffer.from([0xFF, 0x30, 0x30, 0xFF]))
    
    expect(result.countBE).toBe(65328);
    expect(result.countLE).toBe(65328);
  });
});

describe('storing a field', () => {
  it('does not add to the result', () => {
    const result = 
      new PayloadSpec()
        .field('firstByte', UInt8)
        .store('ignoreMe', UInt8)
        .exec(Buffer.from([0xFF, 0x01]));

    expect(result.firstByte).toBe(255);
    expect(result.ignoreMe).toBeUndefined();
  });

  it('skips the required number of bytes', () => {
    const result =
      new PayloadSpec()
        .store('ignoreMe', UInt8)
        .store('andMe', UInt32)
        .field('lastByte', UInt8)
        .exec(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x01]));

    expect(result.ignoreMe).toBeUndefined();
    expect(result.andMe).toBeUndefined();
    expect(result.lastByte).toBe(1);
  })
})

describe('deriving a field', () => {
  it('creates a new field in the result', () => {
    const result = 
      new PayloadSpec()
        .derive('derivedField', () => 5)
        .exec(Buffer.from([]));

    expect(result.derivedField).toBe(5);
  })

  it('does not skip any bytes in the buffer', () => {
    const result =
      new PayloadSpec()
        .derive('derivedField', () => 5)
        .field('firstByte', Int8)
        .exec(Buffer.from([0x02]))

    expect(result.derivedField).toBe(5);
    expect(result.firstByte).toBe(2);
  })

  it('can reference other variables', () => {
    const result =
      new PayloadSpec()
        .field('count', Int8)
        .derive('doubleCount', (r) => r.count * 2)
        .exec(Buffer.from([0x02]))

      expect(result.count).toBe(2);
      expect(result.doubleCount).toBe(4);
  })

  it('can used stored vars as well as fields', () => {
    const result =
      new PayloadSpec()
        .field('count', UInt8)
        .store('factor', UInt8)
        .derive('total', (r) => r.count * r.factor)
        .exec(Buffer.from([0x02, 0x04]))

    expect(result.total).toBe(8);
  })
})

describe('padding', () => {
  it('can be used to align to the byte boundary', () => {
    const result =
      new PayloadSpec()
        .field('enabled', Bool).pad()
        .field('count', Int8)
        .exec(Buffer.from([0x80, 0x02]))
    
    expect(result.enabled).toBe(true);
    expect(result.count).toBe(2);
  })
})

describe('if', () => {
  it('evaluates conditional block', () => {
    const messageType1 = 
      new PayloadSpec()
        .field('a1', UInt8)

    const mainSpec = 
      new PayloadSpec()
        .field('type', UInt8)
        .if((r) => r.type === 1, messageType1)

    const result1 = mainSpec.exec(Buffer.from([0x01, 0x02]));

    expect(result1.type).toBe(1);
    expect(result1.a1).toBe(2);

    const result2 = mainSpec.exec(Buffer.from([0x00, 0x02]));

    expect(result2.type).toBe(0);
    expect(result2.a1).toBeUndefined();
  })

  it('can accept PayloadSpec created inline', () => {

    const mainSpec = 
      new PayloadSpec()
        .field('type', UInt8)
        .if((r) => r.type === 1, new PayloadSpec()
          .field('a1', UInt8)
        )

    const result1 = mainSpec.exec(Buffer.from([0x01, 0x02]));

    expect(result1.type).toBe(1);
    expect(result1.a1).toBe(2);
  })
})

describe('include', () => {
  it('evaluates another spec if expression is true', () => {

  })
});