import { PayloadSpec, Mode } from '../payload_spec';
import { UInt8, Int8, UInt16, Float, UInt32, Text } from '../types';

describe('A PayloadSpec', () => {

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
      const spec = new PayloadSpec(Mode.BE);

      spec.field('countBE', UInt16)
          .endianness(Mode.LE)
          .field('countLE', UInt16)
          .endianness(Mode.BE)
          .field('countBE2', UInt16)

      const result: any = spec.exec(Buffer.from([0xFF, 0x30, 0x30, 0xFF, 0xFF, 0x30]))
      
      expect(result.countBE).toBe(65328);
      expect(result.countLE).toBe(65328);
      expect(result.countBE2).toBe(65328);
    });
  });
});

describe('Documentation examples', () => {
  test('The quick start', () => {
    const spec = new PayloadSpec();        // big endian by default

    spec.field('count', UInt32)            // 4 byte unsigned integer
        .field('temperature', UInt8, 
              { then: (f: number) => (f - 32) * (5/9) })        // 1 byte unsigned, which we convert from Farenheit to Celsius
        .field('stationId', Text, { size: 3 })  // 4 bytes of text, utf8 by default

    const result = spec.exec(Buffer.from([0xFF, 0x30, 0x19, 0xA0, 0xD4, 0x42, 0x48, 0x36]));

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
        .field('numericText', Text, { then: parseInt })
        .field('temperature', UInt8, { then: (f: any) => (f - 32) * (5/9)})
        .exec(Buffer.from([0x31, 0x32, 0x33, 0xD4]))

    expect(result.numericText).toBe(123);
    expect(result.temperature).toBe(100);
  })
})