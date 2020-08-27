import { PayloadSpec } from '../payload_spec'
import { Text, Int8, Int16, UInt8, Bit } from '../types';

describe('Text', () => {
  it('reads text as ascii', () => {
    const spec = new PayloadSpec();

    spec.field('name', Text, { size: 3 });

    const result = spec.exec(Buffer.from([0x62, 0x6f, 0x62]));

    expect(result.name).toBe('bob');
  });

  it('sets offsets correctly', () => {
    const spec = new PayloadSpec();

    spec.field('count', Int16)
        .field('name', Text, { size: 3 })
        .field('temp', UInt8);

    const result = spec.exec(Buffer.from([0xFF, 0x30, 0x62, 0x6f, 0x62, 0xA0]));

    expect(result.count).toBe(-208);
    expect(result.name).toBe('bob');
    expect(result.temp).toBe(160);
  });

  it('uses utf8 by default', () => {
    const spec = new PayloadSpec();

    spec.field('iSpeak', Text, { size: 15 });

    const result = spec.exec(Buffer.from([0xE3, 0x83, 0xA6, 0xE3, 0x83, 0x8B, 0xE3, 0x82, 0xB3, 0xE3, 0x83, 0xBC, 0xE3, 0x83, 0x89]));
    
    expect(result.iSpeak).toBe('ユニコード');
  });

  it('can use other encodings', () => {
    const spec = new PayloadSpec();

    spec.field('b64', Text, { size: 15, encoding: 'base64' });
    
    const result = spec.exec(Buffer.from([0xE3, 0x83, 0xA6, 0xE3, 0x83, 0x8B, 0xE3, 0x82, 0xB3, 0xE3, 0x83, 0xBC, 0xE3, 0x83, 0x89]));

    expect(result.b64).toBe('44Om44OL44Kz44O844OJ');
  });

  it('gives raw hex as text when hex encoding used', () => {
    const spec = new PayloadSpec();

    spec.field('imei', Text, { size: 8, encoding: 'hex' });
    
    const result = spec.exec(Buffer.from([0x36, 0x19, 0x24, 0x33, 0x12, 0x52, 0x10, 0x10]));

    expect(result.imei).toBe('3619243312521010');
  })

  it('can specify a terminator', () => {
    const spec = new PayloadSpec();

    spec.field('name', Text, { terminator: 0x00 })
        .field('one', Int8);
    
    const result = spec.exec(Buffer.from([0x62, 0x6f, 0x62, 0x00, 0x32]));

    expect(result.name).toBe('bob');
    expect(result.one).toBe(50);
  });

  it('reads to end of buffer if neither size nor terminator is specified', () => {
    const spec = new PayloadSpec();

    spec.field('one', Int8)
        .field('name', Text);
    
    const result = spec.exec(Buffer.from([0x32, 0x62, 0x6f, 0x62, 0x62, 0x6f, 0x62]));

    expect(result.name).toBe('bobbob');
    expect(result.one).toBe(50);
  });

  it('supports then function to do conversions', () => {
    const spec = new PayloadSpec();

    spec.field('number', Text, { then: parseInt });

    const result = spec.exec(Buffer.from([0x31, 0x32, 0x33]))

    expect(result.number).toBe(123);
  })
})

describe('Bit', () => {
  it('retrieves a single bit from the field', () => {
    const spec = new PayloadSpec();

    spec.field('enabled', Bit);

    const result = spec.exec(Buffer.from([0x80]));

    expect(result.enabled).toBe(true);
  })

  it('can read multiple bits in a row', () => {
    const spec = new PayloadSpec();

    spec.field('enabled', Bit)
        .field('ledOff', Bit)
        .field('releaseTheHounds', Bit);

    const result = spec.exec(Buffer.from([0xA0]));

    expect(result.enabled).toBe(true);
    expect(result.ledOff).toBe(false);
    expect(result.releaseTheHounds).toBe(true);

  });

  it('can read bits after reading bytes', () => {
    const spec = new PayloadSpec();

    spec.field('firstByte', UInt8)
        .field('secondByte', UInt8)
        .field('enabled', Bit)
        .field('ledOff', Bit)
        .field('releaseTheHounds', Bit)

    const result = spec.exec(Buffer.from([0x01, 0x02, 0xA0]))

    expect(result.enabled).toBe(true);
    expect(result.ledOff).toBe(false);
    expect(result.releaseTheHounds).toBe(true);
  })
});