import { Spec } from '../../payload_spec/payload_spec'
import { Text, Int8, Int16, UInt8, Bit, Bits2, Bits3, Bits4, Bits5, Bits6, Bits7, Bool, Bits8, Bits9, Bits10, Bits11, Bits12, Bits13, Bits14, Bits15, Bits16 } from '../../pos_buffer/types';

describe('Text', () => {
  it('reads text as ascii', () => {
    const spec = new Spec();

    spec.field('name', Text, { size: 3 });

    const result = spec.exec(Buffer.from([0x62, 0x6f, 0x62]));

    expect(result.name).toBe('bob');
  });

  it('sets offsets correctly', () => {
    const spec = new Spec();

    spec.field('count', Int16)
        .field('name', Text, { size: 3 })
        .field('temp', UInt8);

    const result = spec.exec(Buffer.from([0xFF, 0x30, 0x62, 0x6f, 0x62, 0xA0]));

    expect(result.count).toBe(-208);
    expect(result.name).toBe('bob');
    expect(result.temp).toBe(160);
  });

  it('uses utf8 by default', () => {
    const spec = new Spec();

    spec.field('iSpeak', Text, { size: 15 });

    const result = spec.exec(Buffer.from([0xE3, 0x83, 0xA6, 0xE3, 0x83, 0x8B, 0xE3, 0x82, 0xB3, 0xE3, 0x83, 0xBC, 0xE3, 0x83, 0x89]));
    
    expect(result.iSpeak).toBe('ユニコード');
  });

  it('can use other encodings', () => {
    const spec = new Spec();

    spec.field('b64', Text, { size: 15, encoding: 'base64' });
    
    const result = spec.exec(Buffer.from([0xE3, 0x83, 0xA6, 0xE3, 0x83, 0x8B, 0xE3, 0x82, 0xB3, 0xE3, 0x83, 0xBC, 0xE3, 0x83, 0x89]));

    expect(result.b64).toBe('44Om44OL44Kz44O844OJ');
  });

  it('gives raw  hex as text when hex encoding used', () => {
    const spec = new Spec();

    spec.field('imei', Text, { size: 8, encoding: 'hex' });
    
    const result = spec.exec(Buffer.from([0x36, 0x19, 0x24, 0x33, 0x12, 0x52, 0x10, 0x10]));

    expect(result.imei).toBe('3619243312521010');
  })

  it('can specify a terminator', () => {
    const spec = new Spec();

    spec.field('name', Text, { terminator: 0x00 })
        .field('one', Int8);
    
    const result = spec.exec(Buffer.from([0x62, 0x6f, 0x62, 0x00, 0x32]));

    expect(result.name).toBe('bob');
    expect(result.one).toBe(50);
  });

  it('includes terminator in offset', () => {

    const spec = new Spec();

    spec.field('one', Text, { terminator: 0x00 })
        .field('two', Text, { terminator: 0x00 })
        .field('three', Text, { terminator: 0x00 });
    
    const result = spec.exec(Buffer.from([0x31, 0x00, 0x32, 0x00, 0x33, 0x00]));

    expect(result.one).toBe('1');
    expect(result.two).toBe('2');
    expect(result.three).toBe('3');
  });

  it('reads to end of buffer if neither size nor terminator is specified', () => {
    const spec = new Spec();

    spec.field('one', Int8)
        .field('name', Text);
    
    const result = spec.exec(Buffer.from([0x32, 0x62, 0x6f, 0x62, 0x62, 0x6f, 0x62]));

    expect(result.name).toBe('bobbob');
    expect(result.one).toBe(50);
  });

  it('sets size if reading to end of buffer', () => {
    const spec = new Spec();

    spec.field('one', Int8)
        .field('name', Text)
        .field('error', Int8);
    
    expect(() => spec.exec(Buffer.from([0x32, 0x62, 0x6f, 0x62, 0x62, 0x6f, 0x62]))).toThrow(new Error('Attempt to read outside of the buffer'));
  });

  it('supports then function to do conversions', () => {
    const spec = new Spec();

    spec.field('number', Text, { then: parseInt });

    const result = spec.exec(Buffer.from([0x31, 0x32, 0x33]))

    expect(result.number).toBe(123);
  })

  it('allows size to be specified dynamically', () => {
    const spec = new Spec()
      .field('size', UInt8)
      .field('number', Text, { size: (r) => r.size });

    const result = spec.exec(Buffer.from([0x02, 0x31, 0x32, 0x33]))

    expect(result.number).toBe('12');
  })
})


describe('Bool', () => {
  it('retrieves a single bit from the field as a boolean', () => {
    const spec = new Spec();

    spec.field('enabled', Bool);

    const result = spec.exec(Buffer.from([0x80]));

    expect(result.enabled).toBe(true);
  })

  it('can read multiple bools in a row', () => {
    const spec = new Spec();

    spec.field('enabled', Bool)
        .field('ledOff', Bool)
        .field('releaseTheHounds', Bool);

    const result = spec.exec(Buffer.from([0xA0]));

    expect(result.enabled).toBe(true);
    expect(result.ledOff).toBe(false);
    expect(result.releaseTheHounds).toBe(true);

  });

  it('can read bools after reading bytes', () => {
    const spec = new Spec();

    spec.field('firstByte', UInt8)
        .field('secondByte', UInt8)
        .field('enabled', Bool)
        .field('ledOff', Bool)
        .field('releaseTheHounds', Bool)

    const result = spec.exec(Buffer.from([0x01, 0x02, 0xA0]))

    expect(result.enabled).toBe(true);
    expect(result.ledOff).toBe(false);
    expect(result.releaseTheHounds).toBe(true);
  })
});

describe('Bit', () => {
  it('retrieves a single bit from the field as 0 or 1', () => {
    const spec = new Spec();

    spec.field('enabled', Bit);

    const result = spec.exec(Buffer.from([0x80]));

    expect(result.enabled).toBe(1);
  })

  it('can read multiple bits in a row', () => {
    const spec = new Spec();

    spec.field('enabled', Bit)
        .field('ledOff', Bit)
        .field('releaseTheHounds', Bit);

    const result = spec.exec(Buffer.from([0xA0]));

    expect(result.enabled).toBe(1);
    expect(result.ledOff).toBe(0);
    expect(result.releaseTheHounds).toBe(1);

  });

  it('can read bits after reading bytes', () => {
    const spec = new Spec();

    spec.field('firstByte', UInt8)
        .field('secondByte', UInt8)
        .field('enabled', Bit)
        .field('ledOff', Bit)
        .field('releaseTheHounds', Bit)

    const result = spec.exec(Buffer.from([0x01, 0x02, 0xA0]))

    expect(result.enabled).toBe(1);
    expect(result.ledOff).toBe(0);
    expect(result.releaseTheHounds).toBe(1);
  })
});

describe('Bits', () => {
  it('has aliases for taking 2-16 bits', async () => {
    const spec = new Spec()
      .field('bits2', Bits2)
      .field('bits3', Bits3)
      .field('bits4', Bits4)
      .field('bits5', Bits5)
      .field('bits6', Bits6)
      .field('bits7', Bits7)
      .field('bits8', Bits8)
      .field('bits9', Bits9)
      .field('bits10', Bits10)
      .field('bits11', Bits11)
      .field('bits12', Bits12)
      .field('bits13', Bits13)
      .field('bits14', Bits14)
      .field('bits15', Bits15)
      .field('bits16', Bits16)
      .pad()
      .field('check', UInt8);

    const result = spec.exec(Buffer.from([0xA5, 0x32, 0x7F, 0xC3, 0x77, 0xA1, 0x3B, 0x55, 0xFF, 0xCA, 0xD1, 0x2F, 0x40, 0xEE, 0xBF, 0x4D, 0x04, 0xFF]))

    expect(result.bits2).toBe(2);
    expect(result.bits3).toBe(4);
    expect(result.bits4).toBe(10);
    expect(result.bits5).toBe(12);
    expect(result.bits6).toBe(39);
    expect(result.bits7).toBe(126);
    expect(result.bits8).toBe(27);
    expect(result.bits9).toBe(378);
    expect(result.bits10).toBe(78);
    expect(result.bits11).toBe(1707);
    expect(result.bits12).toBe(4089);
    expect(result.bits13).toBe(2884);
    expect(result.bits14).toBe(12096);
    expect(result.bits15).toBe(30559);
    expect(result.bits16).toBe(42626);

    expect(result.check).toBe(255);
  });

  it('supports then', () => {
    const result = new Spec()
      .field('bits2', Bits2, { then: (v:number) => v * 4 })
      .exec(Buffer.from([0xC2]))

    expect(result.bits2).toBe(12);

  })
})