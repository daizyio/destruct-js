import { PosBuffer, Mode } from '../pos_buffer';
import { UInt8, Int8, Int16, UInt16, Int32, UInt32, Float, Double, Text, Bool, Bit, Bits10, Bits11, Bits12, Bits13, Bits14, Bits15, Bits16, Bits2, Bits3, Bits4, Bits5, Bits6, Bits7, Bits8, Bits9 } from '../types';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeHex(expectedHex: string): R;
    }
  }
}

expect.extend({
  toBeHex(received, expectedHex) {
    const bufferAsHex = received.toString('hex').toUpperCase();

    return bufferAsHex === expectedHex ? 
      ({ pass: true, message: () => `Expected ${bufferAsHex} not to be ${expectedHex}`})
      : ({ pass: false, message: () => `Expected ${bufferAsHex} to be ${expectedHex}` })
  }
})

describe('Constructing a PosBuffer', () => {
  it('can take a Buffer in the constructor', () => {
    const buffer = new PosBuffer(Buffer.from([0xFF]));
    expect(buffer.read(UInt8)).toBe(255);
  });
});

describe('Numeric types', () => {
  it('reads a UInt8', () => {
    const buffer = new PosBuffer([0xFF]);

    expect(buffer.read(UInt8)).toBe(255);
  });

  it('reads a UInt8 LE', () => {
    const buffer = new PosBuffer([0xFF], { endianness: Mode.LE });

    expect(buffer.read(UInt8)).toBe(255);
  });

  it('writes a UInt8', () => {
    const buffer = new PosBuffer([]);

    buffer.write(UInt8, 255);
    expect(buffer).toBeHex('FF');
  });

  it('writes a UInt8 LE', () => {
    const buffer = new PosBuffer([], { endianness: Mode.LE });

    buffer.write(UInt8, 255);
    expect(buffer).toBeHex('FF');
  });

  it('reads a Int8', () => {
    const buffer = new PosBuffer([0xFF]);

    expect(buffer.read(Int8)).toBe(-1);
  });

  it('reads a Int8 LE', () => {
    const buffer = new PosBuffer([0xFF], { endianness: Mode.LE });

    expect(buffer.read(Int8)).toBe(-1);
  });

  it('writes a Int8', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Int8, 127);
    buffer.write(Int8, -1);
    expect(buffer).toBeHex('7FFF');
  });

  it('writes a Int8 LE', () => {
    const buffer = new PosBuffer([], { endianness: Mode.LE });

    buffer.write(Int8, 127);
    buffer.write(Int8, -1);
    expect(buffer).toBeHex('7FFF');
  });

  it('reads an Int16 BE', () => {
    const buffer = new PosBuffer([0xAE, 0xC4]);

    expect(buffer.read(Int16)).toBe(-20796);
  });

  it('reads an Int16 LE', () => {
    const buffer = new PosBuffer([0xC4, 0xAE], { endianness: Mode.LE });

    expect(buffer.read(Int16)).toBe(-20796);
  });

  it('writes an Int16 BE', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Int16, 15423);
    buffer.write(Int16, 1);
    expect(buffer).toBeHex('3C3F0001');
  });

  it('writes an Int16 LE', () => {
    const buffer = new PosBuffer([], { endianness: Mode.LE });

    buffer.write(Int16, 15423);
    buffer.write(Int16, 1);
    expect(buffer).toBeHex('3F3C0100');
  });

  it('reads a UInt16', () => {
    const buffer = new PosBuffer([0xAE, 0xC4]);

    expect(buffer.read(UInt16)).toBe(44740);
  });

  it('reads a UInt16 LE', () => {
    const buffer = new PosBuffer([0xC4, 0xAE], { endianness: Mode.LE });

    expect(buffer.read(UInt16)).toBe(44740);
  });

  it('writes an UInt16', () => {
    const buffer = new PosBuffer([]);

    buffer.write(UInt16, 48879);
    expect(buffer).toBeHex('BEEF');
  });

  it('writes an UInt16 LE', () => {
    const buffer = new PosBuffer([], { endianness: Mode.LE });

    buffer.write(UInt16, 48879);
    expect(buffer).toBeHex('EFBE');
  });

  it('reads an Int32 BE', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x45, 0xFA]);

    expect(buffer.read(Int32)).toBe(-1362868742);
  });

  it('writes an Int32 BE', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Int32, -1362868742);
    expect(buffer).toBeHex('AEC445FA');
  });

  it('reads an Int32 LE', () => {
    const buffer = new PosBuffer([0xFA, 0x45, 0xC4, 0xAE], { endianness: Mode.LE });

    expect(buffer.read(Int32)).toBe(-1362868742);
  });


  it('writes an Int32 LE', () => {
    const buffer = new PosBuffer([], { endianness: Mode.LE });

    buffer.write(Int32, -1362868742);
    expect(buffer).toBeHex('FA45C4AE');
  });

  it('reads a UInt32 BE', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x45, 0xFA]);

    expect(buffer.read(UInt32)).toBe(2932098554);
  });

  it('writes an UInt32 BE', () => {
    const buffer = new PosBuffer([]);

    buffer.write(UInt32, 2932098554);
    expect(buffer).toBeHex('AEC445FA');
  });

  it('reads a UInt32 LE', () => {
    const buffer = new PosBuffer([0xFA, 0x45, 0xC4, 0xAE], { endianness: Mode.LE });

    expect(buffer.read(UInt32)).toBe(2932098554);
  });

  it('writes an UInt32 LE', () => {
    const buffer = new PosBuffer([], { endianness: Mode.LE });

    buffer.write(UInt32, 2932098554);
    expect(buffer).toBeHex('FA45C4AE');
  });

  it('reads a signed float', () => {
    const buffer = new PosBuffer([0x40, 0x49, 0x0F, 0xD0]);
    
    expect(buffer.read(Float)).toBe(3.141590118408203);
  });

  it('writes a signed float BE', () => {
    const buffer = new PosBuffer([]);
    
    buffer.write(Float, 3.141590118408203);
    expect(buffer).toBeHex('40490FD0');
  });

  it('reads a signed float LE', () => {
    const buffer = new PosBuffer([0xD0, 0x0F, 0x49, 0x40], { endianness: Mode.LE });
    
    expect(buffer.read(Float)).toBe(3.141590118408203);
  });

  it('writes a signed float LE', () => {
    const buffer = new PosBuffer([], { endianness: Mode.LE });
    
    buffer.write(Float, 3.141590118408203);
    expect(buffer).toBeHex('D00F4940');
  });

  it('reads a signed double BE', () => {
    const buffer = new PosBuffer([0x40, 0x09, 0x21, 0xCA, 0xC0, 0x83, 0x12, 0x6F]);
    
    expect(buffer.read(Double)).toBe(3.14150000000000018118839761883E0);
  });

  it('reads a signed double LE', () => {
    const buffer = new PosBuffer([0x6F, 0x12, 0x83, 0xC0, 0xCA, 0x21, 0x09, 0x40], { endianness: Mode.LE });
    
    expect(buffer.read(Double)).toBe(3.14150000000000018118839761883E0);
  });

  it('writes a signed double BE', () => {
    const buffer = new PosBuffer([]);
    
    buffer.write(Double, 3.14150000000000018118839761883E0);
    expect(buffer).toBeHex('400921CAC083126F');
  });

  it('writes a signed double LE', () => {
    const buffer = new PosBuffer([], { endianness: Mode.LE });
    
    buffer.write(Double, 3.14150000000000018118839761883E0);
    expect(buffer).toBeHex('6F1283C0CA210940');
  });
});

describe('Floating point numbers', () => {
  it('can specify decimal places', () => {
    const buffer = new PosBuffer([0x40, 0x49, 0x0F, 0xD0, 0x40, 0x49, 0x0F, 0xD0]);
    expect(buffer.read(Float, { dp: 3 })).toBe(3.142);
    expect(buffer.read(Float, { dp: 1 })).toBe(3.1);
  });
});

describe('Text', () => {
  it('reads text as ascii', () => {
    const buffer = new PosBuffer([0x62, 0x6f, 0x62]);

    expect(buffer.read(Text)).toBe('bob');
  });


  it('writes text as ascii', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Text, 'bob');
    expect(buffer).toBeHex('626F62');
  });

  it('can read a specified size', () => {
    const buffer = new PosBuffer([0xFF, 0x30, 0x62, 0x6f, 0x62, 0xA0]);

    expect(buffer.read(Int16)).toBe(-208);
    expect(buffer.read(Text, { size: 3 })).toBe('bob');
    expect(buffer.read(UInt8)).toBe(160);
  });

  it('can write a specified size', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Text, 'bobalobacus', { size: 3 });
    expect(buffer).toBeHex('626F62');
  })

  it('uses utf8 by default', () => {
    const buffer = new PosBuffer([0xE3, 0x83, 0xA6, 0xE3, 0x83, 0x8B, 0xE3, 0x82, 0xB3, 0xE3, 0x83, 0xBC, 0xE3, 0x83, 0x89]);
    
    expect(buffer.read(Text, { size: 15 })).toBe('ユニコード');
  });

  it('writes utf8 by default', () => {
    const buffer = new PosBuffer([]);
    
    buffer.write(Text, 'ユニコード');
    expect(buffer).toBeHex('E383A6E3838BE382B3E383BCE38389');
  });

  it('can read other encodings', () => {
    const buffer = new PosBuffer([0xE3, 0x83, 0xA6, 0xE3, 0x83, 0x8B, 0xE3, 0x82, 0xB3, 0xE3, 0x83, 0xBC, 0xE3, 0x83, 0x89]);

    expect(buffer.read(Text, { size: 15, encoding: 'base64' })).toBe('44Om44OL44Kz44O844OJ');
  });

  it('can write other encodings', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Text, '44Om44OL44Kz44O844OJ', { encoding: 'base64' });
    expect(buffer).toBeHex('E383A6E3838BE382B3E383BCE38389');
  });

  it('gives raw hex as text when hex encoding used', () => {
    const buffer = new PosBuffer([0x36, 0x19, 0x24, 0x33, 0x12, 0x52, 0x10, 0x10]);

    expect(buffer.read(Text, { size: 8, encoding: 'hex' })).toBe('3619243312521010');
  })

  it('writes raw hex when hex encoding used', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Text, '3619243312521010', { encoding: 'hex' })
    expect(buffer).toBeHex('3619243312521010');
  })

  it('can specify a byte terminator', () => {
    const buffer = new PosBuffer([0x62, 0x6f, 0x62, 0x00, 0x32]);

    expect(buffer.read(Text, { terminator: 0x00 })).toBe('bob');
    expect(buffer.read(Int8)).toBe(50);
  });

  it('can write a byte terminator', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Text, 'bob', { terminator: 0x00 })
    expect(buffer).toBeHex('626F6200');
  });

  it('can specify a char terminator', () => {
    const buffer = new PosBuffer([0x62, 0x6f, 0x62, 0x3B, 0x32]);

    expect(buffer.read(Text, { terminator: ';' })).toBe('bob');
    expect(buffer.read(Int8)).toBe(50);
  });

  it('can write a char terminator', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Text, 'bob', { terminator: ';' })
    expect(buffer).toBeHex('626F623B');
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

  it('writes a single bit, MSB first', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Bool, true);

    expect(buffer).toBeHex('80');
  })

  it('can read multiple bools in a row', () => {
    const buffer = new PosBuffer([0xA0]);

    expect(buffer.read(Bool)).toBe(true);
    expect(buffer.read(Bool)).toBe(false);
    expect(buffer.read(Bool)).toBe(true);
  });

  it('can write multiple bools in a row', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Bool, true);
    buffer.write(Bool, false);
    buffer.write(Bool, true);
    buffer.write(Bool, false);
    buffer.write(Bool, true);

    expect(buffer).toBeHex('A8');
  })

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

  it('can write a single bit', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Bit, 1);

    expect(buffer).toBeHex('80');
  })
  
  it('can read multiple bits in a row', () => {
    const buffer = new PosBuffer([0xA0]);

    expect(buffer.read(Bit)).toBe(1);
    expect(buffer.read(Bit)).toBe(0);
    expect(buffer.read(Bit)).toBe(1);

  });

  it('can write multiple bits in a row', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Bit, 1);
    buffer.write(Bit, 0);
    buffer.write(Bit, 1);

    expect(buffer).toBeHex('A0');
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

  it('can write bits', () => {
    const buffer = new PosBuffer([]);

    buffer.write(Bits2, 2);
    buffer.write(Bits3, 4);
    buffer.write(Bits4, 10);
    buffer.write(Bits5, 12);
    buffer.write(Bits6, 39);
    buffer.write(Bits7, 126);
    buffer.write(Bits8, 27);
    buffer.write(Bits9, 378);
    buffer.write(Bits10, 78);
    buffer.write(Bits11, 1707);
    buffer.write(Bits12, 4089);
    buffer.write(Bits13, 2884);
    buffer.write(Bits14, 12096);
    buffer.write(Bits15, 30559);
    buffer.write(Bits16, 42626);

    expect(buffer).toBeHex('A5327FC377A13B55FFCAD12F40EEBF4D04');
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

  it('can write multiple values in succession', () => {
    const buffer = new PosBuffer([]);
    
    buffer.write(UInt8, 255);
    buffer.write(Int8, -1);
    buffer.write(Int16, -20796);
    buffer.write(UInt16, 44740);
    buffer.write(Int32, -1362868742);
    buffer.write(UInt32, 2932098554);
    buffer.write(Float, 3.141590118408203);
    buffer.write(Double, 3.14150000000000018118839761883E0);

    expect(buffer).toBeHex('FFFFAEC4AEC4AEC445FAAEC445FA40490FD0400921CAC083126F');
  })
})

describe('then', () => {
  it('executes the function once the value has been read', () => {
    const buffer = new PosBuffer([0x0A]);

    expect(buffer.read(Int8, { then: (v) => v * 10})).toBe(100);
  })
})

describe('padding', () => {
  it('can be used to align to the byte boundary', () => {    
    const buffer = new PosBuffer([0x80, 0x02]);
    expect(buffer.read(Bool)).toBe(true);
    buffer.pad();
    expect(buffer.read(Int8)).toBe(2);
  });

  it('can be used to align to the byte boundary for writing', () => {    
    const buffer = new PosBuffer([]);

    buffer.write(Bool, true);
    buffer.pad();
    buffer.write(Int8, 2);

    expect(buffer).toBeHex('8002');
  });

  it('throws an error if trying to read Int from a non-padded position', () => {
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

describe('Lenient mode', () => {
  it('returns undefined if reading past the end of the buffer', () => {
    const buffer = new PosBuffer([0x80, 0x02], { lenient: true });

    buffer.read(UInt16);
    expect(buffer.read(UInt8)).toBeUndefined();
    expect(buffer.read(UInt16)).toBeUndefined();
    expect(buffer.read(Float)).toBeUndefined();
  })

  it('errors if reading past the end of the buffer and lenient mode is false', () => {
    const buffer = new PosBuffer([0x80, 0x02], { lenient: false });

    buffer.read(UInt16);
    expect(() => buffer.read(UInt8)).toThrowError();
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

  it('can skip while writing', () => {
    const buffer = new PosBuffer([]);

    buffer.write(UInt16, 44740);
    buffer.skip(1);
    buffer.write(UInt16, 50483);

    expect(buffer).toBeHex('AEC400C533');
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

  it('can skip to after the final byte of the buffer', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x00, 0xC5, 0x33]);

    expect(() => buffer.skip(5)).not.toThrowError();
  })

  it('cannot be skipped beyond the end of the buffer', () => {
    const buffer = new PosBuffer([0xAE, 0xC4, 0x00, 0xC5, 0x33]);

    expect(() => buffer.skip(6)).toThrowError(new Error('Attempt to skip outside the buffer'));
  })

  it('cannot be skipped before the start of the buffer', () => {
    const buffer = new PosBuffer([0xAE]);

    expect(() => buffer.skip(-1)).toThrowError(new Error('Attempt to skip outside the buffer'));
  })

  it('can be skipped to before first byte of the buffer', () => {
    const buffer = new PosBuffer([0xAE]);

    expect(() => buffer.skip(1).skip(-1)).not.toThrowError();
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
    expect(buffer.read(UInt8)).toBe(174);
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

describe('Buffer methods', () => {
  test('length returns the length of the underlying buffer', () => {
    const buffer = new PosBuffer([0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA]);
    
    expect(buffer.length).toBe(6);
  })

  test('slice returns a PosBuffer with a slice of the underlying array', () => {
    const buffer = new PosBuffer([0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA]);
    
    const newBuffer = buffer.slice(2);

    expect(newBuffer.read(UInt8)).toBe(253);
    expect(newBuffer.length).toBe(4);
  })

  test('toString() returns a string view of the buffer', () => {
    const buffer = new PosBuffer([0x62, 0x6f, 0x62]);

    expect(buffer.toString()).toBe('bob');
    expect(buffer.toString('utf8', 1)).toBe('ob');
    expect(buffer.toString('utf8', 0, 2)).toBe('bo');
  })

  test('buffer property returns the underlying buffer', () => {
    const posBuffer = new PosBuffer([0x62, 0x6f, 0x62]);

    expect(posBuffer.buffer).toBeInstanceOf(Buffer);
  })
})

describe('Read many', () => {
  it('can read multiple values in one go', () => {
    const buffer = new PosBuffer([0xFF, 0x40, 0x49, 0x0F, 0xD0, 0xFA, 0x62, 0x6f, 0x62, 0x00, 0x62, 0x61, 0x62, 0xAA, 0x05, 0x01, 0x02, 0x03, 0x04, 0x05]);

    const [first, second, third] = buffer.readMany([
      { type: UInt8 },
      { type: Float, options: { dp: 2 }},
      { type: Int8 }
    ])

    expect(first).toBe(255);
    expect(second).toBe(3.14);
    expect(third).toBe(-6);

    const [name1, name2] = buffer.readMany([
      { type: Text, options: { terminator: 0x00 }},
      { type: Text, options: { size: 3 }},
    ]);

    expect(name1).toBe('bob');
    expect(name2).toBe('bab');

    const [bits74, bit3, bit2, bits10] = buffer.readMany([
      { type: Bits4 },
      { type: Bit },
      { type: Bit },
      { type: Bits2 },
    ])

    expect(bits74).toBe(10);
    expect(bit3).toBe(1);
    expect(bit2).toBe(0);
    expect(bits10).toBe(2);

    const loopCount = buffer.read(UInt8);

    for (let i = 0; i < loopCount! ; i++) {
      const value = buffer.read(UInt8);
      expect(value).toBe(i + 1);
    }
  })
})