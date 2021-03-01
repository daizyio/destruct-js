import { Spec } from '../../payload_spec/payload_spec';
import { Mode } from '../../pos_buffer/pos_buffer';
import { UInt8, Int8, UInt16, Float, UInt32, Text, Bit, Bool, Bits3, Bits5, Bits2, Bits8 } from '../../pos_buffer/types';
import '../matchers';

describe('Simple fields', () => {
  it('reads fields in order from the buffer', () => {
    const spec = new Spec();

    spec.field('count', UInt8)
        .field('temp', UInt8)
        .field('pi', Float);

    const result = spec.exec(Buffer.from([0xFF, 0x02, 0x40, 0x49, 0x0F, 0xD0]));

    expect(result.count).toBe(255);
    expect(result.temp).toBe(2);
    expect(result.pi).toBe(3.141590118408203);
  });

  it('can read a field as little endian', () => {
    const spec = new Spec();

    spec.field('count', UInt16, { mode: Mode.LE })

    const result = spec.exec(Buffer.from([0xFF, 0x02]));

    expect(result.count).toBe(767);
  });
  
  it('writes fields in order to the buffer', () => {
    const spec = new Spec();

    spec.field('count', UInt8)
        .field('temp', UInt8)
        .field('pi', Float);

    const result = spec.write({ count: 255, temp: 2, pi: 3.141590118408203});

    expect(result).toBeHex('FF0240490FD0');
  });

  it('can use lenient mode to stop parsing when buffer ends', () => {
    const spec = new Spec({ lenient: true });

    spec.field('count', UInt8)
        .field('temp', UInt8)
        .field('optional', UInt8)

    const result = spec.exec(Buffer.from([0xFF, 0x02]));

    expect(result.count).toBe(255);
    expect(result.temp).toBe(2);
    expect(result.optional).toBeUndefined();
  })
});
describe('skip', () => {
  it('skips a number of bytes', () => {
    const spec = new Spec();
    
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
    const spec = new Spec();
    
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

  it('allows skip to the final byte of the buffer', () => {
    const spec = new Spec();
    
    spec.field('count', UInt8)
        .skip(Int8)
        .field('temp', UInt8)
        .skip(UInt32)
        
    expect(() => spec.exec(Buffer.from([0x16, 0x00, 0x7F, 0x00, 0x00, 0x00, 0x01]))).not.toThrowError();
  });

  it('supports skip when writing', () => {
    const spec = new Spec();
    
    spec.field('count', UInt8)
        .skip(1)
        .field('temp', UInt8)
        .skip(3)
        .field('humidity', UInt8);

    const result = spec.write({ count: 22, temp: 127, humidity: 1});

    expect(result).toBeHex('16007F00000001');
  });
});

describe('endianness', () => {
  it('can switch enddianness', () => {
    const result = new Spec({ mode: Mode.BE })
        .field('countBE', UInt16)
          .endianness(Mode.LE)
        .field('countLE', UInt16)
          .endianness(Mode.BE)
        .exec(Buffer.from([0xFF, 0x30, 0x30, 0xFF]))
    
    expect(result.countBE).toBe(65328);
    expect(result.countLE).toBe(65328);
  });

  it('can switch endianness when writing', () => {
    const result = new Spec({ mode: Mode.BE })
      .field('countBE', UInt16)
        .endianness(Mode.LE)
      .field('countLE', UInt16)
        .endianness(Mode.BE)
      .write({ countBE: 65328, countLE: 65328 })
  
    expect(result).toBeHex('FF3030FF');
  })
});

describe('storing a field', () => {
  it('does not add to the result', () => {
    const result = 
      new Spec()
        .field('firstByte', UInt8)
        .store('ignoreMe', UInt8)
        .exec(Buffer.from([0xFF, 0x01]));

    expect(result.firstByte).toBe(255);
    expect(result.ignoreMe).toBeUndefined();
  });

  it('skips the required number of bytes', () => {
    const result =
      new Spec()
        .store('ignoreMe', UInt8)
        .store('andMe', UInt32)
        .field('lastByte', UInt8)
        .exec(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x01]));

    expect(result.ignoreMe).toBeUndefined();
    expect(result.andMe).toBeUndefined();
    expect(result.lastByte).toBe(1);
  })

  it('writes stored fields', () => {
    const result =
    new Spec()
      .store('ignoreMe', UInt8)
      .store('andMe', UInt32)
      .field('lastByte', UInt8)
      .write({ ignoreMe: 255, andMe: 4294967295, lastByte: 1 })
    
    expect(result).toBeHex('FFFFFFFFFF01');
  })
})

describe('deriving a field', () => {
  it('creates a new field in the result', () => {
    const result = 
      new Spec()
        .derive('derivedField', () => 5)
        .exec(Buffer.from([]));

    expect(result.derivedField).toBe(5);
  })

  it('does not skip any bytes in the buffer', () => {
    const result =
      new Spec()
        .derive('derivedField', () => 5)
        .field('firstByte', Int8)
        .exec(Buffer.from([0x02]))

    expect(result.derivedField).toBe(5);
    expect(result.firstByte).toBe(2);
  })

  it('can reference other variables', () => {
    const result =
      new Spec()
        .field('count', Int8)
        .derive('doubleCount', (r) => r.count * 2)
        .exec(Buffer.from([0x02]))

      expect(result.count).toBe(2);
      expect(result.doubleCount).toBe(4);
  })

  it('can used stored vars as well as fields', () => {
    const result =
      new Spec()
        .field('count', UInt8)
        .store('factor', UInt8)
        .derive('total', (r) => r.count * r.factor)
        .exec(Buffer.from([0x02, 0x04]))

    expect(result.total).toBe(8);
  })

  it('ignores derived fields when writing', () => {
    const result =
      new Spec()
        .field('count', UInt8)
        .store('factor', UInt8)
        .derive('total', (r) => r.count * r.factor)
        .write({ count: 2, factor: 4, total: 8 });

    expect(result).toBeHex('0204');
  })
})

describe('padding', () => {
  it('can be used to align to the byte boundary', () => {
    const result =
      new Spec()
        .field('enabled', Bool).pad()
        .field('count', Int8)
        .exec(Buffer.from([0x80, 0x02]))
    
    expect(result.enabled).toBe(true);
    expect(result.count).toBe(2);
  });

  it('aligns to the byte boundary when writing', () => {
    const result =
      new Spec()
        .field('enabled', Bool).pad()
        .field('count', Int8)
        .write({ enabled: true, count: 2 })
    
    expect(result).toBeHex('8002');
  });

  it('throws an error if trying to write Int from a non-padded position', () => {
    const spec = 
      new Spec()
        .field('enabled', Bool)
        .field('count', Int8)
    
    expect(() => spec.write({ enabled: true, count: 2 })).toThrowError(new Error('Buffer position is not at a byte boundary (bit offset 1). Do you need to use pad()?'));
  })

  it('does not error if previous bits add up to byte boundary when reading', () => {
    const spec = 
      new Spec()
        .field('enabled', Bool)
        .field('days', Bits5)
        .field('frequency', Bits2)
        .field('count', Int8)
      
    expect(() => spec.exec(Buffer.from([0x80, 0x02]))).not.toThrowError(new Error('Buffer position is not at a byte boundary (bit offset 0). Do you need to use pad()?'))
  })

  it('does not error if previous bits add up to byte boundary when writing', () => {
    const spec = 
      new Spec()
        .field('enabled', Bool)
        .field('days', Bits5)
        .field('frequency', Bits2)
        .field('count', Int8)
      
    expect(() => spec.write({ enabled: true, days: 12, frequency: 2, count: 36 })).not.toThrowError(new Error('Buffer position is not at a byte boundary (bit offset 0). Do you need to use pad()?'))
  })
})

describe('if', () => {
  it('evaluates conditional block', () => {
    const messageType1 = 
      new Spec()
        .field('a1', UInt8)

    const mainSpec = 
      new Spec()
        .field('type', UInt8)
        .if((r) => r.type === 1, messageType1)

    const result1 = mainSpec.exec(Buffer.from([0x01, 0x02]));

    expect(result1.type).toBe(1);
    expect(result1.a1).toBe(2);

    const result2 = mainSpec.exec(Buffer.from([0x00, 0x02]));

    expect(result2.type).toBe(0);
    expect(result2.a1).toBeUndefined();
  })


  it('evaluates conditional block when writing', () => {
    const messageType1 = 
      new Spec()
        .field('a1', UInt8)

    const mainSpec = 
      new Spec()
        .field('type', UInt8)
        .if((r) => r.type === 1, messageType1)

    const result1 = mainSpec.write({ type: 1, a1: 2 })

    expect(result1).toBeHex('0102');

    const result2 = mainSpec.write({ type: 0 })

    expect(result2).toBeHex('00');
  })

  it('can accept Spec created inline', () => {

    const mainSpec = 
      new Spec()
        .field('type', UInt8)
        .if((r) => r.type === 1, new Spec()
          .field('a1', UInt8)
        )

    const result1 = mainSpec.exec(Buffer.from([0x01, 0x02]));

    expect(result1.type).toBe(1);
    expect(result1.a1).toBe(2);
  });

  it('maintains a bit offset', () => {

    const mainSpec = 
      new Spec()
        .field('type', Bits3)
        .if((r) => true, new Spec()
          .field('a1', Bits8)
        )

    const result1 = mainSpec.exec(Buffer.from([0xA1, 0xD2]));

    expect(result1.type).toBe(5);
    expect(result1.a1).toBe(14);
  })

  it('maintains a bit offset when writing', () => {

    const mainSpec =
      new Spec()
        .field('type', Bits3)
        .if((r) => true, new Spec()
          .field('a1', Bits8)
        )
        .field('last', Bits5)

    const result = mainSpec.write({ type: 5, a1: 14, last: 18 });

    expect(result).toBeHex('A1D2');
  });  
})

describe('literal value', () => {
  it('puts a literal string in the output', () => {
    const spec = 
      new Spec()
        .field('type', 'install')

    const data = spec.exec(Buffer.from([0x00]));

    expect(data.type).toBe('install');
  });

  it('ignores literals when writing', () => {
    const spec = 
      new Spec()
        .field('type', 'install')
        .field('one', UInt8)

    const data = spec.write({ type: 'install', one: 1 });

    expect(data).toBeHex('01');
  });

  it('puts a literal number in the output', () => {
    const spec = 
      new Spec()
        .field('type', 23)
        .field('float', 3.14)

    const data = spec.exec(Buffer.from([0x00]));

    expect(data.type).toBe(23);
    expect(data.float).toBe(3.14);
  });

  it('puts a literal boolean in the output', () => {
    const spec = 
      new Spec()
        .field('enabled', true)

    const data = spec.exec(Buffer.from([0x00]));

    expect(data.enabled).toBe(true);
  });

  it('can also be used with store', () => {
    const spec =
      new Spec()
        .store('enabled', true)
        .store('pi', 3.14)
        .store('add', '1')
        .derive('res', (r) => {
          if(r.enabled) {
            return r.pi - parseInt(r.add)
          } else {
            return r.pi + parseInt(r.add)
          }
        })

    const data = spec.exec(Buffer.from([0x00]));

    expect(data.res).toBe(2.14);
  });
});
describe('should be', () => {
  
  it('continues if the values match the expected', () => {
    const spec =
      new Spec()
        .field('enabled', Bool, { shouldBe: true })
        .field('days', Bits3, { shouldBe: 5 })
        .pad()
        .field('frequency', UInt8, { shouldBe: 3 })

    const data = spec.exec(Buffer.from([0xD0, 0x03]))

    expect(data.enabled).toBe(true);
    expect(data.days).toBe(5);
    expect(data.frequency).toBe(3);
  });

  it('throws an error if the output doesnt match the expected', () => {
    const spec =
      new Spec()
        .field('frequency', UInt8, { shouldBe: 3 })

    expect(() => spec.exec(Buffer.from([0x04]))).toThrowError(new Error('Expected frequency to be 3 but was 4'));
  });

  it('still works if the expected value is falsy', () => {
    const spec =
      new Spec()
        .field('frequency', UInt8, { shouldBe: 0 })

    expect(() => spec.exec(Buffer.from([0x01]))).toThrowError(new Error('Expected frequency to be 0 but was 1'));
  });

  it('works for text', () => {
    const spec =
      new Spec()
        .field('name', Text, { size: 3, shouldBe: 'bob' })

    expect(() => spec.exec(Buffer.from([0x6e, 0x65, 0x64]))).toThrowError(new Error('Expected name to be bob but was ned'));
  })

  it('works for bits', () => {
    const spec =
      new Spec()
        .field('bits', Bits3, { shouldBe: 4 })
      
    expect(() => spec.exec(Buffer.from([0x00]))).toThrowError(new Error('Expected bits to be 4 but was 0'));
  })

  it('validates when writing', () => {
    const spec =
      new Spec()
        .field('enabled', Bool, { shouldBe: true })
        .field('days', Bits3, { shouldBe: 5 })
        .pad()
        .field('frequency', UInt8, { shouldBe: 3 })

    expect(() => spec.write({ enabled: true, days: 5, frequency: 4})).toThrowError(new Error('Expected frequency to be 3 but was 4'));
  });
});

describe('switch', () => {
  it('looks up a spec in a table', () => {
    const specOne = 
      new Spec()
        .field('one', UInt8)

    const specTwo =
      new Spec()
        .skip(1)
        .field('two', UInt8)

    const mainSpec =
      new Spec()
        .field('type', UInt8)
        .switch((r) => r.type, {
          '128': specOne,
          '0': specTwo
        });

    const result = mainSpec.exec(Buffer.from([0x80, 0x01, 0x02]));

    expect(result.type).toBe(128);
    expect(result.one).toBe(1);
    expect(result.two).toBeUndefined();

    const result2 = mainSpec.exec(Buffer.from([0x00, 0x01, 0x02]));

    expect(result2.type).toBe(0);
    expect(result2.one).toBeUndefined();
    expect(result2.two).toBe(2);

  });

  it('looks up a spec during writes', () => {
    const specOne = 
      new Spec()
        .field('one', UInt8)

    const specTwo =
      new Spec()
        .skip(1)
        .field('two', UInt8)

    const mainSpec =
      new Spec()
        .field('type', UInt8)
        .switch((r) => r.type, {
          '128': specOne,
          '0': specTwo
        });

    const result = mainSpec.write({ type: 128, one: 1 });

    expect(result).toBeHex('8001');

    const result2 = mainSpec.write({ type: 0, one: 1, two: 2 });

    expect(result2).toBeHex('000002');
  });

  it('uses the default option if the lookup does not succeed', () => {
    const specOne = 
      new Spec()
        .field('one', UInt8)

    const specTwo =
      new Spec()
        .skip(1)
        .field('two', UInt8)

    const mainSpec =
      new Spec()
        .field('type', UInt8)
        .switch((r) => r.type, {
          128: specOne,
          default: specTwo
        });

    const result = mainSpec.exec(Buffer.from([0x00, 0x01, 0x02]));

    expect(result.type).toBe(0);
    expect(result.one).toBeUndefined;
    expect(result.two).toBe(2);
  })
});

describe('loop', () => {
  it('puts sub-spec into a nested property', () => {
    const loopSpec = 
      new Spec()
        .loop('nest', 3, new Spec()
          .field('val1', UInt8)
          .field('val2', UInt8)
        )

    const result = loopSpec.exec(Buffer.from([0x01, 0xFF, 0x02, 0xFE, 0x03, 0xFD]));

    expect(result.nest).toBeDefined();
    expect(result.nest).toHaveLength(3);
    expect(result.nest[0].val1).toBe(1);
    expect(result.nest[0].val2).toBe(255);
    expect(result.nest[1].val1).toBe(2);
    expect(result.nest[1].val2).toBe(254);
    expect(result.nest[2].val1).toBe(3);
    expect(result.nest[2].val2).toBe(253);
  })

  it('reads sub-spec from nested properties when writing', () => {
    const loopSpec = 
      new Spec()
        .loop('nest', 3, new Spec()
          .field('val1', UInt8)
          .field('val2', UInt8)
        )

    const result = loopSpec.write({ nest: [ { val1: 1, val2: 255 }, { val1: 2, val2: 254 }, { val1: 3, val2: 253 }]});

    expect(result).toBeHex('01FF02FE03FD')
  })

  it('does not duplicate values in nested specs', () => {
    const loopSpec = 
      new Spec()
        .field('topLevel', UInt8)
        .loop('nest', 3, new Spec()
          .field('val1', UInt8)
          .field('val2', UInt8)
        )

    const result = loopSpec.exec(Buffer.from([0x10, 0x01, 0xFF, 0x02, 0xFE, 0x03, 0xFD]));

    expect(result.topLevel).toBe(16);
    expect(result.nest).toBeDefined();
    expect(result.nest).toHaveLength(3);
    expect(result.nest[0].val1).toBe(1);
    expect(result.nest[0].val2).toBe(255);
    expect(result.nest[0].topLevel).toBeUndefined();
  })

  it('can reference variables from outside the loop', () => {
    const loopSpec = 
      new Spec()
        .store('var', 10)
        .loop('nest', 2, new Spec()
          .store('val', UInt8)
            .derive('val1', (r) => r.var + r.val)
          .field('val2', UInt8)
        )

    const result = loopSpec.exec(Buffer.from([0x01, 0xFF, 0x02, 0xFE]));

    expect(result.nest).toBeDefined();
    expect(result.nest).toHaveLength(2);
    expect(result.nest[0].val1).toBe(11);
    expect(result.nest[0].val2).toBe(255);
    expect(result.nest[1].val1).toBe(12);
    expect(result.nest[1].val2).toBe(254);
  })

  it('can use a result variable for the number of repetitions', () => {
    const loopSpec = 
      new Spec()
        .field('arrayLength', UInt8)
        .loop('nest', r => r.arrayLength, new Spec()
          .field('val1', UInt8)
        )

    const result = loopSpec.exec(Buffer.from([0x02, 0xFF, 0xFE]));

    expect(result.arrayLength).toBe(2);
    expect(result.nest).toBeDefined();
    expect(result.nest).toHaveLength(2);
    expect(result.nest[0].val1).toBe(255);
    expect(result.nest[1].val1).toBe(254);
  })

  it('loops until the end of the buffer if function is null', () => {
    const loopSpec = 
      new Spec()
        .field('arrayLength', UInt8)
        .loop('nest', null, new Spec()
          .field('val1', UInt8)
        )

    const result = loopSpec.exec(Buffer.from([0x02, 0xFF, 0xFE, 0xFD, 0xFC]));

    expect(result.arrayLength).toBe(2);
    expect(result.nest).toBeDefined();
    expect(result.nest).toHaveLength(4);
    expect(result.nest[0].val1).toBe(255);
    expect(result.nest[1].val1).toBe(254);
    expect(result.nest[2].val1).toBe(253);
    expect(result.nest[3].val1).toBe(252);
  })

  it('errors if looping is incomplete at end of buffer', () => {
    const loopSpec = 
      new Spec()
        .field('arrayLength', UInt8)
        .loop('nest', null, new Spec()
          .field('val1', UInt16)
        )

    expect(() => loopSpec.exec(Buffer.from([0x02, 0xFF, 0xFE, 0xFD, 0xFC, 0xFB]))).toThrowError();
  })

  it('errors if loop variable is not a number', () => {
    const loopSpec = 
      new Spec()
        .field('arrayLength', Text, { size: 3 })
        .loop('nest', r => r.arrayLength, new Spec()
          .field('val1', UInt8)
        )

    expect(() => loopSpec.exec(Buffer.from([0x6e, 0x65, 0x64, 0xFF, 0xFE]))).toThrowError('Loop count must be an integer');
  })

  it('loops over whole array if no loop count specified when writing', () => {
    const loopSpec = 
      new Spec()
        .loop('nest', null, new Spec()
          .field('val1', UInt8)
          .field('val2', UInt8)
        )

    const result = loopSpec.write({ nest: [ { val1: 1, val2: 255 }, { val1: 2, val2: 254 }, { val1: 3, val2: 253 }]});

    expect(result).toBeHex('01FF02FE03FD')
  })

  it('errors if loop variable is not an integer', () => {
    const loopSpec = 
      new Spec()
        .field('arrayLength', Float)
        .loop('nest', r => r.arrayLength, new Spec()
          .field('val1', UInt8)
        )

    expect(() => loopSpec.exec(Buffer.from([0x40, 0x49, 0x0F, 0xD0, 0xFF, 0xFE]))).toThrowError('Loop count must be an integer');
  })

  it('can be nested', () => {
    const loopSpec = 
      new Spec()
        .loop('level1', 2, new Spec()
          .field('l1Size', UInt8)
          .loop('level2', (r) => r.l1Size, new Spec()
            .field('l2Value', UInt8))
        )

    const result = loopSpec.exec(Buffer.from([0x02, 0xFF, 0xFE, 0x03, 0x10, 0x11, 0x12]));

    expect(result.level1).toBeDefined();
    expect(result.level1).toHaveLength(2);
    expect(result.level1[0].l1Size).toBe(2);
    expect(result.level1[0].level2).toHaveLength(2);
    expect(result.level1[0].level2[0].l2Value).toBe(255);
    expect(result.level1[0].level2[1].l2Value).toBe(254);

    expect(result.level1[1].l1Size).toBe(3);
    expect(result.level1[1].level2).toHaveLength(3);
    expect(result.level1[1].level2[0].l2Value).toBe(16);
    expect(result.level1[1].level2[1].l2Value).toBe(17);
    expect(result.level1[1].level2[2].l2Value).toBe(18);
  })

  it('can write multiple nesting', () => {
    const loopSpec = 
      new Spec()
        .loop('level1', 2, new Spec()
          .field('l1Size', UInt8)
          .loop('level2', (r) => r.l1Size, new Spec()
            .field('l2Value', UInt8))
        )

    const result = loopSpec.write({ level1: [ { l1Size: 2, level2: [ { l2Value: 255 }, { l2Value: 254 }] }, { l1Size: 3, level2: [ { l2Value: 16 }, { l2Value: 17 }, { l2Value: 18 }]}]});

    expect(result).toBeHex('02FFFE03101112');
  })
})

describe('include', () => {
  it('includes another spec at the current level', () => {
    const includedSpec = new Spec()
      .field('middle', UInt16)

    const mainSpec = new Spec()
      .field('first', UInt8)
      .include(includedSpec)
      .field('last', UInt8)

    const result = mainSpec.read(Buffer.from([0x01, 0x02, 0x03, 0x04]));

    expect(result.first).toBe(1);
    expect(result.middle).toBe(515);
    expect(result.last).toBe(4);
  })

  it('includes another spec at the current level when writing', () => {
    const includedSpec = new Spec()
      .field('middle', UInt16)

    const mainSpec = new Spec()
      .field('first', UInt8)
      .include(includedSpec)
      .field('last', UInt8)

    const result = mainSpec.write({ first: 1, middle: 515, last: 4});

    expect(result).toBeHex('01020304');
  })
})

describe('group', () => {
  it('groups included specs under a different key', () => {
    const header = new Spec()
      .field('version', UInt8)
      .field('fileSize', UInt16)

    const dataBlock = new Spec()
      .field('identifier', UInt8)
      .field('dataLength', UInt8)

    const mainSpec = new Spec()
      .group('header', header)
      .group('data', dataBlock)

    const result = mainSpec.read(Buffer.from([0x02, 0x00, 0x80, 0xDE, 0x03]))

    expect(result).toEqual({
      header: {
        version: 2,
        fileSize: 128
      },
      data: {
        identifier: 0xDE,
        dataLength: 3
      }
    })
  })
})
describe('tap', () => {
  it('executes the provided code and passes the buffer and current state', () => {
    let fieldOne = null;
    const tappedSpec = 
      new Spec()
        .field('one', UInt8)
        .tap((buffer, readerState) => fieldOne = readerState.result.one)
        .field('two', UInt8)

    const result = tappedSpec.exec(Buffer.from([0x10, 0x01]))

    expect(result.one).toBe(16)
    expect(fieldOne).toBe(16);
  })

  it('can be tapped while writing', () => {
    const tappedSpec = 
      new Spec()
        .field('one', UInt8)
        .tap((buffer, readerState) => buffer.write(UInt8, 255))
        .field('two', UInt8)

    const result = tappedSpec.write({ one: 16, two: 1 })

    expect(result).toBeHex('10FF01');
  });
})

describe('writing', () => {
  it('writes data', () => {
    const data = {
      one: 12,
      two: 1024,
      flag: true,
      bit1: 1,
      bit2: 0,
      bit3: 1,
      fl: 3.14
    }
    const spec = new Spec()
      .field('one', UInt8)
      .field('two', UInt16)
      .skip(1)
      .field('flag', Bool)
      .field('bit1', Bit)
      .field('bit2', Bit)
      .field('bit3', Bit)
      .pad()
      .field('fl', Float)

    const result = spec.write(data);

    expect(result.toString('hex').toUpperCase()).toBe("0C040000D04048F5C3")
  })

  it('writes zeroes if relevant data not found in the input', () => {
    const data = { mid: 3 };

    const spec = new Spec()
      .field('start', UInt16)
      .field('mid', UInt8)
      .field('end', UInt32)

    const result = spec.write(data);

    expect(result).toBeHex('00000300000000');
  })

  it('writes single bool with padding', () => {
    const data = {
      one: 12,
      two: 1024,
      flag: true,
    }
    const spec = new Spec()
      .field('one', UInt8)
      .field('two', UInt16)
      .field('flag', Bool)
      .skip(2)

    const result = spec.write(data);

    expect(result.toString('hex').toUpperCase()).toBe("0C0400800000")
  })

})

describe('then/before', () => {
  it('uses then option to post-process a value when reading', () => {
    const buffer = Buffer.from('0C0400', 'hex');

    const spec = new Spec()
      .field('one', UInt8, { then: v => v * 2 })
      .field('two', UInt16, { then: v => v / 2})

    const result = spec.read(buffer);

    expect(result.one).toBe(24);
    expect(result.two).toBe(512);
  })

  it('uses before option to pre-process a value when writing', () => {
    const data = {
      one: 24,
      two: 512
    }

    const spec = new Spec()
      .field('one', UInt8, { before: v => v / 2 })
      .field('two', UInt16, { before: v => v * 2})

    const result = spec.write(data);

    expect(result).toBeHex('0C0400');
  })
})