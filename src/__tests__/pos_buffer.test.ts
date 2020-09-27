import { Mode, PayloadSpec } from '../payload_spec';
import PosBuffer from '../pos_buffer';
import { UInt8, Int8, Int16, UInt16, Int32, UInt32, Float, Double, Text, Bool, Bit, Bits10, Bits11, Bits12, Bits13, Bits14, Bits15, Bits16, Bits2, Bits3, Bits4, Bits5, Bits6, Bits7, Bits8, Bits9 } from '../types';

describe('Numeric types', () => {
  it('reads a UInt8', () => {
    const buffer = new PosBuffer([0xFF]);

    expect(buffer.read(UInt8)).toBe(255);
  });

  it('reads a Int8', () => {
    const buffer = new PosBuffer([0xFF]);

    expect(buffer.read(Int8)).toBe(-1);
  });

  it('reads an Int16', () => {
    const buffer = new PosBuffer([0xAE, 0xC4]);

    expect(buffer.read(Int16)).toBe(-20796);
  });

  it('reads a UInt16', () => {
    const buffer = new PosBuffer([0xAE, 0xC4]);

    expect(buffer.read(UInt16)).toBe(44740);
  });

  it('reads an Int32', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x45, 0xFA]);

    expect(buffer.read(Int32)).toBe(-1362868742);
  });

  it('reads a UInt32', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x45, 0xFA]);

    expect(buffer.read(UInt32)).toBe(2932098554);
  });

  it('reads a signed float', () => {
    const buffer = new PosBuffer([0x40, 0x49, 0x0F, 0xD0]);
    
    expect(buffer.read(Float)).toBe(3.141590118408203);
  });

  it('reads a signed double', () => {
    const buffer = new PosBuffer([0x40, 0x09, 0x21, 0xCA, 0xC0, 0x83, 0x12, 0x6F]);
    
    expect(buffer.read(Double)).toBe(3.14150000000000018118839761883E0);
  });
});

describe('Text', () => {
  it('reads text as ascii', () => {
    const buffer = new PosBuffer([0x62, 0x6f, 0x62]);

    expect(buffer.read(Text)).toBe('bob');
  });

  it('sets offsets correctly', () => {
    const buffer = new PosBuffer([0xFF, 0x30, 0x62, 0x6f, 0x62, 0xA0]);

    expect(buffer.read(Int16)).toBe(-208);
    expect(buffer.read(Text, { size: 3})).toBe('bob');
    expect(buffer.read(UInt8)).toBe(160);
  });

  it('uses utf8 by default', () => {
    const buffer = new PosBuffer([0xE3, 0x83, 0xA6, 0xE3, 0x83, 0x8B, 0xE3, 0x82, 0xB3, 0xE3, 0x83, 0xBC, 0xE3, 0x83, 0x89]);
    
    expect(buffer.read(Text, { size: 15 })).toBe('ユニコード');
  });

  it('can use other encodings', () => {
    const buffer = new PosBuffer([0xE3, 0x83, 0xA6, 0xE3, 0x83, 0x8B, 0xE3, 0x82, 0xB3, 0xE3, 0x83, 0xBC, 0xE3, 0x83, 0x89]);

    expect(buffer.read(Text, { size: 15, encoding: 'base64' })).toBe('44Om44OL44Kz44O844OJ');
  });

  it('gives raw  hex as text when hex encoding used', () => {
    const buffer = new PosBuffer([0x36, 0x19, 0x24, 0x33, 0x12, 0x52, 0x10, 0x10]);

    expect(buffer.read(Text, { size: 8, encoding: 'hex' })).toBe('3619243312521010');
  })

  it('can specify a terminator', () => {
    const spec = new PayloadSpec();

    spec.field('name', Text, { terminator: 0x00 })
        .field('one', Int8);
    
    const buffer = new PosBuffer([0x62, 0x6f, 0x62, 0x00, 0x32]);

    expect(buffer.read(Text, { terminator: 0x00 })).toBe('bob');
    expect(buffer.read(Int8)).toBe(50);
  });

  it('includes terminator in offset', () => {    
    const buffer = new PosBuffer([0x31, 0x00, 0x32, 0x00, 0x33, 0x00]);

    expect(buffer.read(Text, { terminator: 0x00 })).toBe('1');
    expect(buffer.read(Text, { terminator: 0x00 })).toBe('2');
    expect(buffer.read(Text, { terminator: 0x00 })).toBe('3');
  });

  it('reads to end of buffer if neither size nor terminator is specified', () => {
    const buffer = new PosBuffer([0x32, 0x62, 0x6f, 0x62, 0x62, 0x6f, 0x62]);

    expect(buffer.read(Int8)).toBe(50);
    expect(buffer.read(Text)).toBe('bobbob');
    
  });

  it('sets size if reading to end of buffer', () => {
    const buffer = new PosBuffer([0x32, 0x62, 0x6f, 0x62, 0x62, 0x6f, 0x62]);

    expect(buffer.read(Int8)).toBe(50);
    expect(buffer.read(Text)).toBe('bobbob');
    expect(() => buffer.read(Int8)).toThrow(new Error('Attempt to read outside of the buffer'));
  });
});


describe('Bool', () => {
  it('retrieves a single bit from the field as a boolean', () => {
    const buffer = new PosBuffer([0x80]);

    expect(buffer.read(Bool)).toBe(true);
  })

  it('can read multiple bools in a row', () => {
    const buffer = new PosBuffer([0xA0]);

    expect(buffer.read(Bool)).toBe(true);
    expect(buffer.read(Bool)).toBe(false);
    expect(buffer.read(Bool)).toBe(true);

  });

  it('can read bools after reading bytes', () => {
    const buffer = new PosBuffer([0x01, 0x02, 0xA0]);

    buffer.read(UInt8);
    buffer.read(UInt8);
    expect(buffer.read(Bool)).toBe(true);
    expect(buffer.read(Bool)).toBe(false);
    expect(buffer.read(Bool)).toBe(true);
  })
});

describe('Bit', () => {
  it('retrieves a single bit from the field as 0 or 1', () => {
    const buffer = new PosBuffer([0x80]);

    expect(buffer.read(Bit)).toBe(1);
  })

  it('can read multiple bits in a row', () => {
    const buffer = new PosBuffer([0xA0]);

    expect(buffer.read(Bit)).toBe(1);
    expect(buffer.read(Bit)).toBe(0);
    expect(buffer.read(Bit)).toBe(1);

  });

  it('can read bits after reading bytes', () => {
    const buffer = new PosBuffer([0x01, 0x02, 0xA0]);

    buffer.read(UInt8);
    buffer.read(UInt8);
    expect(buffer.read(Bit)).toBe(1);
    expect(buffer.read(Bit)).toBe(0);
    expect(buffer.read(Bit)).toBe(1);
  })
});

describe('Bits', () => {
  it('has aliases for taking 2-16 bits', async () => {
    const spec = new PayloadSpec()
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

    const buffer = new PosBuffer([0xA5, 0x32, 0x7F, 0xC3, 0x77, 0xA1, 0x3B, 0x55, 0xFF, 0xCA, 0xD1, 0x2F, 0x40, 0xEE, 0xBF, 0x4D, 0x04, 0xFF]);

    expect(buffer.read(Bits2)).toBe(2);
    expect(buffer.read(Bits3)).toBe(4);
    expect(buffer.read(Bits4)).toBe(10);
    expect(buffer.read(Bits5)).toBe(12);
    expect(buffer.read(Bits6)).toBe(39);
    expect(buffer.read(Bits7)).toBe(126);
    expect(buffer.read(Bits8)).toBe(27);
    expect(buffer.read(Bits9)).toBe(378);
    expect(buffer.read(Bits10)).toBe(78);
    expect(buffer.read(Bits11)).toBe(1707);
    expect(buffer.read(Bits12)).toBe(4089);
    expect(buffer.read(Bits13)).toBe(2884);
    expect(buffer.read(Bits14)).toBe(12096);
    expect(buffer.read(Bits15)).toBe(30559);
    expect(buffer.read(Bits16)).toBe(42626);

    buffer.pad();
    expect(buffer.read(UInt8)).toBe(255);
  });
})

describe('Chained operations', () => {
  it('can read multiple values in succession', () => {
    const buffer = new PosBuffer([0xFF, 0xFF, 0xAE, 0xC4, 0xAE, 0xC4, 0xAE, 0xC4, 0x45, 0xFA, 0xAE, 0xC4, 0x45, 0xFA, 0x40, 0x49, 0x0F, 0xD0, 0x40, 0x09, 0x21, 0xCA, 0xC0, 0x83, 0x12, 0x6F]);
    
    expect(buffer.read(UInt8)).toBe(255);
    expect(buffer.read(Int8)).toBe(-1);
    expect(buffer.read(Int16)).toBe(-20796);
    expect(buffer.read(UInt16)).toBe(44740);
    expect(buffer.read(Int32)).toBe(-1362868742);
    expect(buffer.read(UInt32)).toBe(2932098554);
    expect(buffer.read(Float)).toBe(3.141590118408203);
    expect(buffer.read(Double)).toBe(3.14150000000000018118839761883E0);
  })
})

describe('padding', () => {
  it('can be used to align to the byte boundary', () => {    
    const buffer = new PosBuffer([0x80, 0x02]);
    expect(buffer.read(Bool)).toBe(true);
    buffer.pad();
    expect(buffer.read(Int8)).toBe(2);
  });

  it('throws an error if trying to read Int from a non-padded position', () => {
    const spec = 
      new PayloadSpec()
        .field('enabled', Bool)
        .field('count', Int8)
    
    const buffer = new PosBuffer([0x80, 0x02]);

    buffer.read(Bool);
    expect(() => buffer.read(Int8)).toThrowError(new Error('Buffer position is not at a byte boundary (bit offset 1). Do you need to use pad()?'))
  })

  it('does not error if previous bits add up to byte boundary', () => {    
    const buffer = new PosBuffer([0x80, 0x02]);

    buffer.read(Bool);
    buffer.read(Bits5);
    buffer.read(Bits2);
    expect(() => buffer.read(Int8)).not.toThrowError(new Error('Buffer position is not at a byte boundary (bit offset 0). Do you need to use pad()?'))
  })
})

describe('Endianness', () => {
  it('can have endianness set in the constructor', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0xFA, 0xAE, 0xC4, 0x45], { endianness: Mode.LE});

    expect(buffer.read(UInt16)).toBe(50350);
    expect(buffer.read(UInt32)).toBe(1170517754);
  });
})

describe('Skipping', () => {
  it('skips the specified bytes', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x00, 0xC5, 0x33]);

    expect(buffer.read(UInt16)).toBe(44740);
    
    buffer.skip(1);
    
    expect(buffer.read(UInt16)).toBe(50483);
  })

  it('can be chained', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x00, 0xC5, 0x33]);

    expect(buffer.read(UInt16)).toBe(44740);
    
    expect(buffer.skip(1).read(UInt16)).toBe(50483);
  })

  it('can be skipped backwards', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x00, 0xC5, 0x33]);

    expect(buffer.read(UInt16)).toBe(44740);

    expect(buffer.skip(-1).read(UInt8)).toBe(196);
  })

  it('cannot be skipped beyond the end of the buffer', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x00, 0xC5, 0x33]);

    expect(() => buffer.skip(5)).toThrowError(new Error('Attempt to skip outside the buffer'));
  })

  it('cannot be skipped before the start of the buffer', () => {
    const buffer = new PosBuffer([0xAE]);

    expect(() => buffer.skip(-1)).toThrowError(new Error('Attempt to skip outside the buffer'));
  })

  it('can add skips together', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x00, 0xC5, 0x33]);

    buffer.skip(2).skip(2);

    expect(buffer.read(UInt8)).toBe(51);
  })
})

describe('Peeking', () => {
  it('reads bytes at the specified offset without moving position', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x00, 0xC5, 0x33]);

    expect(buffer.peek(UInt8, 3)).toBe(197);
  })

  it('throws error if trying to peek at an invalid address', () => {
    const buffer = new PosBuffer([0xAE, 0xCE]);
    expect(() => buffer.peek(UInt8, 3)).toThrowError(new Error('Attempt to peek outside of the buffer'));
    expect(() => buffer.peek(UInt8, -1)).toThrowError(new Error('Attempt to peek outside of the buffer'));
  });

  it('throws error if the datatype would read outside of the buffer', () => {
    const buffer = new PosBuffer([0xAE, 0xC4]);
    expect(buffer.peek(UInt16, 0)).toBe(44740);
    expect(() => buffer.peek(UInt32, 0)).toThrowError(new Error('Attempt to peek outside of the buffer'));
  })
})