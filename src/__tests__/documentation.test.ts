import { PayloadSpec, Mode } from '../payload_spec';
import { UInt32, UInt8, Float, Text, UInt16 } from '../types';

describe('Documentation examples', () => {
  test('The quick start', () => {
    const spec = new PayloadSpec();        // big endian by default

    spec.field('count', UInt32)            // 4 byte unsigned integer
        .field('temperature', UInt8,       // 1 byte unsigned...
              { then: (f: any) => (f - 32) * (5/9)}) // ...which we convert from Farenheit to Celsius
        .skip(1)                                //skip a byte
        .field('stationId', Text, { size: 3 })  // 4 bytes of text, utf8 by default

    const result = spec.exec(Buffer.from([0xFF, 0x30, 0x19, 0xA0, 0xD4, 0xFF, 0x42, 0x48, 0x36]));

    expect(result.count).toBe(4281342368);
    expect(result.temperature).toBe(100);
    expect(result.stationId).toBe('BH6');
  })

  test('float decimal places example', () => {
    const result: any = 
      new PayloadSpec()
        .field('count3dp', Float, { dp: 3 })
        .field('count1dp', Float, { dp: 1 })
        .exec(Buffer.from([0x40, 0x49, 0x0F, 0xD0, 0x40, 0x49, 0x0F, 0xD0]));

    expect(result.count3dp).toBe(3.142);
    expect(result.count1dp).toBe(3.1);
  })

  test('fixed size text', () => {
    const result = 
      new PayloadSpec()
        .field('name', Text, { size: 3 })
        .exec(Buffer.from([0x62, 0x6f, 0x62]));

    expect(result.name).toBe('bob');
  })

  test('terminated text', () => {
    const result = 
      new PayloadSpec()
        .field('name', Text, { terminator: 0x00 })
        .exec(Buffer.from([0x62, 0x6f, 0x62, 0x00, 0x31, 0x32, 0x33]));

    expect(result.name).toBe('bob');
  })

  test('unterminated text', () => {
    const result = 
      new PayloadSpec()
        .field('name', Text)
        .exec(Buffer.from([0x62, 0x6f, 0x62, 0x31, 0x32, 0x33]));

    expect(result.name).toBe('bob123');
  })

  test('then example', () => {
    const result = 
      new PayloadSpec()
        .field('numericText', Text, { size: 3, then: parseInt })
        .field('temperature', UInt8, { then: (f: any) => (f - 32) * (5/9)})
        .exec(Buffer.from([0x31, 0x32, 0x33, 0xD4]))

    expect(result.numericText).toBe(123);
    expect(result.temperature).toBe(100);
  })

  test('skip example', () => {
    const result = 
      new PayloadSpec()
        .field('firstByte', UInt8)
        .skip(UInt16)               // same as .skip(2)
        .field('lastByte', UInt8)
        .exec(Buffer.from([0xFF, 0x00, 0x00, 0x01]));
  
    expect(result.firstByte).toBe(255);
    expect(result.lastByte).toBe(1);
  })
  
  test('endianness example', () => {
    const result = 
      new PayloadSpec(Mode.BE)
        .field('countBE', UInt16)
        .endianness(Mode.LE)
        .field('countLE', UInt16)
        .exec(Buffer.from([0xFF, 0x30, 0x30, 0xFF, 0xFF, 0x30]))
      
      expect(result.countBE).toBe(65328);
      expect(result.countLE).toBe(65328);
  })

  test('store example', () => {
    const result = 
    new PayloadSpec()
      .field('firstByte', UInt8)
      .store('ignoreMe', UInt8)
      .exec(Buffer.from([0xFF, 0x01]));

    expect(result.firstByte).toBe(255);
    expect(result.ignoreMe).toBeUndefined();
  })
})