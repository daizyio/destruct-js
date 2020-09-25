import { Mode, PayloadSpec } from '../payload_spec';
import PosBuffer from '../pos_buffer';
import { UInt8, Int8, Int16, UInt16, Int32, UInt32, Float, Double } from '../types';

describe('a PosBuffer', () => {
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
})