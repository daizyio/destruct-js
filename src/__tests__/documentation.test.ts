import { Spec } from '../payload_spec/payload_spec';
import { Mode } from '../pos_buffer/pos_buffer';
import { UInt32, UInt8, Float, Text, UInt16, Bit, Int8, Bool, Bits4, Bits2, Bits5 } from '../pos_buffer/types';

describe('Documentation examples', () => {
  test('The quick start', () => {
    const spec = new Spec();        // big endian by default

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
      new Spec()
        .field('count3dp', Float, { dp: 3 })
        .field('count1dp', Float, { dp: 1 })
        .exec(Buffer.from([0x40, 0x49, 0x0F, 0xD0, 0x40, 0x49, 0x0F, 0xD0]));

    expect(result.count3dp).toBe(3.142);
    expect(result.count1dp).toBe(3.1);
  })

  test('Bool example', () => {
    const result = 
      new Spec()
        .field('enabled', Bool)
        .field('ledOff', Bool)
        .field('releaseTheHounds', Bool)
        .exec(Buffer.from([0xA0]));

    expect(result.enabled).toBe(true);
    expect(result.ledOff).toBe(false);
    expect(result.releaseTheHounds).toBe(true);

  })
  
  test('Bits example', () => {
    const result = 
      new Spec()
        .field('enabled', Bit)
        .field('mode', Bits2)
        .field('frequency', Bits4)
        .field('days', Bits5)
        .exec(Buffer.from([0xD3, 0x3A]));

    expect(result.enabled).toBe(1);
    expect(result.mode).toBe(2);
    expect(result.frequency).toBe(9);
    expect(result.days).toBe(19);

  })

  test('fixed size text', () => {
    const result = 
      new Spec()
        .field('name', Text, { size: 3 })
        .exec(Buffer.from([0x62, 0x6f, 0x62]));

    expect(result.name).toBe('bob');
  })

  test('terminated text', () => {
    const result = 
      new Spec()
        .field('name', Text, { terminator: 0x00 })
        .exec(Buffer.from([0x62, 0x6f, 0x62, 0x00, 0x31, 0x32, 0x33]));

    expect(result.name).toBe('bob');
  })

  test('unterminated text', () => {
    const result = 
      new Spec()
        .field('name', Text)
        .exec(Buffer.from([0x62, 0x6f, 0x62, 0x31, 0x32, 0x33]));

    expect(result.name).toBe('bob123');
  })

  test('then example', () => {
    const result = 
      new Spec()
        .field('numericText', Text, { size: 3, then: parseInt })
        .field('temperature', UInt8, { then: (f: any) => (f - 32) * (5/9)})
        .exec(Buffer.from([0x31, 0x32, 0x33, 0xD4]))

    expect(result.numericText).toBe(123);
    expect(result.temperature).toBe(100);
  })

  test('skip example', () => {
    const result = 
      new Spec()
        .field('firstByte', UInt8)
        .skip(UInt16)               // same as .skip(2)
        .field('lastByte', UInt8)
        .exec(Buffer.from([0xFF, 0x00, 0x00, 0x01]));
  
    expect(result.firstByte).toBe(255);
    expect(result.lastByte).toBe(1);
  })
  
  test('endianness example', () => {
    const result = 
      new Spec({ mode: Mode.BE })
        .field('countBE', UInt16)
        .endianness(Mode.LE)
        .field('countLE', UInt16)
        .exec(Buffer.from([0xFF, 0x30, 0x30, 0xFF, 0xFF, 0x30]))
      
      expect(result.countBE).toBe(65328);
      expect(result.countLE).toBe(65328);
  })

  test('store example', () => {
    const result = 
    new Spec()
      .field('firstByte', UInt8)
      .store('ignoreMe', UInt8)
      .exec(Buffer.from([0xFF, 0x01]));

    expect(result.firstByte).toBe(255);
    expect(result.ignoreMe).toBeUndefined();
  })
  
  test('derive example', () => {
    const result =
      new Spec()
        .field('count', Int8)
        .derive('doubleCount', (r) => r.count * 2)
        .exec(Buffer.from([0x02]))

      expect(result.count).toBe(2);
      expect(result.doubleCount).toBe(4);
  })

  test('pad example', () => {
    const result =
      new Spec()
        .field('enabled', Bool).pad()
        .field('count', Int8)
        .exec(Buffer.from([0x80, 0x02]))
    
    expect(result.enabled).toBe(true);
    expect(result.count).toBe(2);
  })

  test('literal example', () => {
    const result =
      new Spec()
        .field('type', 'install')
        .store('pi', 3.14)
        .exec(Buffer.from([0x00]))

    expect(result.type).toBe('install')
  })

  test('shouldBe example', () => {
    const result = 
      new Spec()
        .field('javaClassIdentifier', UInt32, { shouldBe: 0xCAFEBABE })
        .exec(Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]))

    expect(result.javaClassIdentifier).toBe(0xCAFEBABE);
  })
})