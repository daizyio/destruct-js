import { PayloadSpec, Mode } from '../payload_spec';
import { UInt8, Int8, UInt16, Float, UInt32, Text } from '../types';

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