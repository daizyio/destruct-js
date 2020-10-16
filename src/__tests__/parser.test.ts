import { PayloadSpec, ParsingError } from '../payload_spec';
import { Mode } from '../pos_buffer';
import { UInt8, Int8, UInt16, Float, UInt32, Text, Bit, Bool, Bits3, Bits5, Bits2, Bits8 } from '../types';

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

  it('allows skip to the final byte of the buffer', () => {
    const spec = new PayloadSpec();
    
    spec.field('count', UInt8)
        .skip(Int8)
        .field('temp', UInt8)
        .skip(UInt32)
        
    expect(() => spec.exec(Buffer.from([0x16, 0x00, 0x7F, 0x00, 0x00, 0x00, 0x01]))).not.toThrowError();
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
  });

  it('throws an error if trying to read Int from a non-padded position', () => {
    const spec = 
      new PayloadSpec()
        .field('enabled', Bool)
        .field('count', Int8)
      
    expect(() => spec.exec(Buffer.from([0x80, 0x02]))).toThrowError(new ParsingError('Buffer position is not at a byte boundary (bit offset 1). Do you need to use pad()?'))
  })

  it('does not error if previous bits add up to byte boundary', () => {
    const spec = 
      new PayloadSpec()
        .field('enabled', Bool)
        .field('days', Bits5)
        .field('frequency', Bits2)
        .field('count', Int8)
      
    expect(() => spec.exec(Buffer.from([0x80, 0x02]))).not.toThrowError(new ParsingError('Buffer position is not at a byte boundary (bit offset 0). Do you need to use pad()?'))
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
  });

  it('maintains a bit offset', () => {

    const mainSpec = 
      new PayloadSpec()
        .field('type', Bits3)
        .if((r) => true, new PayloadSpec()
          .field('a1', Bits8)
        )

    const result1 = mainSpec.exec(Buffer.from([0xA1, 0xD2]));

    expect(result1.type).toBe(5);
    expect(result1.a1).toBe(14);
  })
})

describe('literal value', () => {
  it('puts a literal string in the output', () => {
    const spec = 
      new PayloadSpec()
        .field('type', 'install')

    const data = spec.exec(Buffer.from([0x00]));

    expect(data.type).toBe('install');
  });

  it('puts a literal number in the output', () => {
    const spec = 
      new PayloadSpec()
        .field('type', 23)
        .field('float', 3.14)

    const data = spec.exec(Buffer.from([0x00]));

    expect(data.type).toBe(23);
    expect(data.float).toBe(3.14);
  });

  it('puts a literal boolean in the output', () => {
    const spec = 
      new PayloadSpec()
        .field('enabled', true)

    const data = spec.exec(Buffer.from([0x00]));

    expect(data.enabled).toBe(true);
  });

  it('can also be used with store', () => {
    const spec =
      new PayloadSpec()
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
      new PayloadSpec()
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
      new PayloadSpec()
        .field('frequency', UInt8, { shouldBe: 3 })

    expect(() => spec.exec(Buffer.from([0x04]))).toThrowError(new ParsingError('Expected frequency to be 3 but was 4'));
  });

  it('still works if the expected value is falsy', () => {
    const spec =
      new PayloadSpec()
        .field('frequency', UInt8, { shouldBe: 0 })

    expect(() => spec.exec(Buffer.from([0x01]))).toThrowError(new ParsingError('Expected frequency to be 0 but was 1'));
  });

  it('works for text', () => {
    const spec =
      new PayloadSpec()
        .field('name', Text, { size: 3, shouldBe: 'bob' })

    expect(() => spec.exec(Buffer.from([0x6e, 0x65, 0x64]))).toThrowError(new ParsingError('Expected name to be bob but was ned'));
  })

  it('works for bits', () => {
    const spec =
      new PayloadSpec()
        .field('bits', Bits3, { shouldBe: 4 })
      
    expect(() => spec.exec(Buffer.from([0x00]))).toThrowError(new ParsingError('Expected bits to be 4 but was 0'));
  })
});

describe('switch', () => {
  it('looks up a spec in a table', () => {
    const specOne = 
      new PayloadSpec()
        .field('one', UInt8)

    const specTwo =
      new PayloadSpec()
        .skip(1)
        .field('two', UInt8)

    const mainSpec =
      new PayloadSpec()
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

  it('uses the default option if the lookup does not succeed', () => {
    const specOne = 
      new PayloadSpec()
        .field('one', UInt8)

    const specTwo =
      new PayloadSpec()
        .skip(1)
        .field('two', UInt8)

    const mainSpec =
      new PayloadSpec()
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
      new PayloadSpec()
        .loop('nest', 3, new PayloadSpec()
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

  it('does not duplicate values in nested specs', () => {
    const loopSpec = 
      new PayloadSpec()
        .field('topLevel', UInt8)
        .loop('nest', 3, new PayloadSpec()
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
      new PayloadSpec()
        .store('var', 10)
        .loop('nest', 2, new PayloadSpec()
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
      new PayloadSpec()
        .field('arrayLength', UInt8)
        .loop('nest', r => r.arrayLength, new PayloadSpec()
          .field('val1', UInt8)
        )

    const result = loopSpec.exec(Buffer.from([0x02, 0xFF, 0xFE]));

    expect(result.arrayLength).toBe(2);
    expect(result.nest).toBeDefined();
    expect(result.nest).toHaveLength(2);
    expect(result.nest[0].val1).toBe(255);
    expect(result.nest[1].val1).toBe(254);
  })

  it('errors if loop variable is not a number', () => {
    const loopSpec = 
      new PayloadSpec()
        .field('arrayLength', Text, { size: 3 })
        .loop('nest', r => r.arrayLength, new PayloadSpec()
          .field('val1', UInt8)
        )

    expect(() => loopSpec.exec(Buffer.from([0x6e, 0x65, 0x64, 0xFF, 0xFE]))).toThrowError('Loop count must be an integer');
  })

  it('errors if loop variable is not an integer', () => {
    const loopSpec = 
      new PayloadSpec()
        .field('arrayLength', Float)
        .loop('nest', r => r.arrayLength, new PayloadSpec()
          .field('val1', UInt8)
        )

    expect(() => loopSpec.exec(Buffer.from([0x40, 0x49, 0x0F, 0xD0, 0xFF, 0xFE]))).toThrowError('Loop count must be an integer');
  })

  it('can be nested', () => {
    const loopSpec = 
      new PayloadSpec()
        .loop('level1', 2, new PayloadSpec()
          .field('l1Size', UInt8)
          .loop('level2', (r) => r.l1Size, new PayloadSpec()
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
})

describe('tap', () => {
  it('executes the provided code and passes the buffer and current state', () => {
    let fieldOne = null;
    const tappedSpec = 
      new PayloadSpec()
        .field('one', UInt8)
        .tap((buffer, readerState) => fieldOne = readerState.result.one)
        .field('two', UInt8)

    const result = tappedSpec.exec(Buffer.from([0x10, 0x01]))

    expect(result.one).toBe(16)
    expect(fieldOne).toBe(16);
  })
})
