import { PayloadSpec, Mode } from '../payload_spec';
import { UInt8, Int8, UInt16, Int16, UInt32, Int32, Float, Double } from '../types';

describe('UInt8', () => {
  it('reads a single unsigned int', () => {
    const spec = new PayloadSpec();
  
    spec.field('count', UInt8);
  
    const result: any = spec.exec(Buffer.from([0xFF]));
    
    expect(result.count).toBe(255);
  })
  
  it('has bitSize of 8', () => {
    const spec = new PayloadSpec();
  
    spec.field('count', UInt8)
        .field('temp', UInt8)
        .field('humidity', UInt8);
  
    const result: any = spec.exec(Buffer.from([0x1C, 0x2A, 0x03]));
  
    expect(result.count).toBe(28);
    expect(result.temp).toBe(42);
    expect(result.humidity).toBe(3);
  })

  it('ignores endianness', () => {
    const spec = new PayloadSpec(Mode.LE);
  
    spec.field('count', UInt8);
  
    const result: any = spec.exec(Buffer.from([0x30]));
    
    expect(result.count).toBe(48);
  })
})

describe('Int8', () => {
  it('reads a single signed int', () => {
    const spec = new PayloadSpec();

    spec.field('count', Int8);
  
    const result: any = spec.exec(Buffer.from([0xFF]));
    
    expect(result.count).toBe(-1);
  })

  it('ignores endianness', () => {
    const spec = new PayloadSpec(Mode.LE);
  
    spec.field('count', Int8);
  
    const result: any = spec.exec(Buffer.from([0x30]));
    
    expect(result.count).toBe(48);
  })
});

describe('UInt16', () => {
  it('reads a single unsigned 16 bit int', () => {
    const spec = new PayloadSpec();

    spec.field('count', UInt16);
  
    const result: any = spec.exec(Buffer.from([0xFF, 0x30]));
    
    expect(result.count).toBe(65328);
  });

  it('has a bitSize of 16', () => {
    const spec = new PayloadSpec();

    spec.field('count', UInt16);
    spec.field('count2', UInt16);
  
    const result: any = spec.exec(Buffer.from([0xFF, 0x30, 0x19, 0x01]));
    
    expect(result.count).toBe(65328);
    expect(result.count2).toBe(6401);
  });

  it('observes endianness', () => {
    const spec = new PayloadSpec(Mode.LE);
  
    spec.field('count', UInt16);
  
    const result: any = spec.exec(Buffer.from([0x30, 0xFF]));
    
    expect(result.count).toBe(65328);
  });
});

describe('Int16', () => {
  it('reads a single signed 16 bit int', () => {
    const spec = new PayloadSpec();

    spec.field('count', Int16);
  
    const result: any = spec.exec(Buffer.from([0xFF, 0x30]));
    
    expect(result.count).toBe(-208);
  });

  it('has a bitSize of 16', () => {
    const spec = new PayloadSpec();

    spec.field('count', Int16);
    spec.field('count2', Int16);
  
    const result: any = spec.exec(Buffer.from([0xFF, 0x30, 0x19, 0x01]));
    
    expect(result.count).toBe(-208);
    expect(result.count2).toBe(6401);
  });

  it('observes endianness', () => {
    const spec = new PayloadSpec(Mode.LE);
  
    spec.field('count', Int16);
  
    const result: any = spec.exec(Buffer.from([0x30, 0xFF]));
    
    expect(result.count).toBe(-208);
  });
});

describe('UInt32', () => {
  it('reads a single unsigned 32 bit int', () => {
    const spec = new PayloadSpec();

    spec.field('count', UInt32);
  
    const result: any = spec.exec(Buffer.from([0xFF, 0x30, 0x19, 0xA0]));
    
    expect(result.count).toBe(4281342368);
  });

  it('has a bitSize of 32', () => {
    const spec = new PayloadSpec();

    spec.field('count', UInt32);
    spec.field('count2', UInt32);
  
    const result: any = spec.exec(Buffer.from([0xFF, 0x30, 0x19, 0xA0, 0x01, 0x29, 0xBC, 0x88]));
    
    expect(result.count).toBe(4281342368);
    expect(result.count2).toBe(19512456);
  });

  it('observes endianness', () => {
    const spec = new PayloadSpec(Mode.LE);
  
    spec.field('count', UInt32);
  
    const result: any = spec.exec(Buffer.from([0xA0, 0x19, 0x30, 0xFF]));
    
    expect(result.count).toBe(4281342368);
  });
});

describe('Int32', () => {
  it('reads a single signed 32 bit int', () => {
    const spec = new PayloadSpec();

    spec.field('count', Int32);
  
    const result: any = spec.exec(Buffer.from([0xFF, 0x30, 0x19, 0xA0]));
    
    expect(result.count).toBe(-13624928);
  });

  it('has a bitSize of 32', () => {
    const spec = new PayloadSpec();

    spec.field('count', Int32);
    spec.field('count2', Int32);
  
    const result: any = spec.exec(Buffer.from([0xFF, 0x30, 0x19, 0xA0, 0x01, 0x29, 0xBC, 0x88]));
    
    expect(result.count).toBe(-13624928);
    expect(result.count2).toBe(19512456);
  });

  it('observes endianness', () => {
    const spec = new PayloadSpec(Mode.LE);
  
    spec.field('count', Int32);
  
    const result: any = spec.exec(Buffer.from([0xA0, 0x19, 0x30, 0xFF]));
    
    expect(result.count).toBe(-13624928);
  });
});

describe('Float', () => {
  it('reads a signed float', () => {
    const spec = new PayloadSpec();

    spec.field('count', Float);
  
    const result: any = spec.exec(Buffer.from([0x40, 0x49, 0x0F, 0xD0]));
    
    expect(result.count).toBe(3.141590118408203);
  });

  it('has a bitSize of 32', () => {
    const spec = new PayloadSpec();

    spec.field('count', Float);
    spec.field('count2', Float);
  
    const result: any = spec.exec(Buffer.from([0x40, 0x49, 0x0F, 0xD0, 0xc6, 0x00, 0x74, 0xE4]));
    
    expect(result.count).toBe(3.141590118408203);
    expect(result.count2).toBe(-8221.22265625);
  });

  it('observes endianness', () => {
    const spec = new PayloadSpec(Mode.LE);
  
    spec.field('count', Float);
  
    const result: any = spec.exec(Buffer.from([0xD0, 0x0F, 0x49, 0x40]));
    
    expect(result.count).toBe(3.141590118408203);
  });

  it('supports option for decimal places', () => {
    const spec = new PayloadSpec();

    spec.field('count3dp', Float, { dp: 3 })
        .field('count1dp', Float, { dp: 1 })

    const result: any = spec.exec(Buffer.from([0x40, 0x49, 0x0F, 0xD0, 0x40, 0x49, 0x0F, 0xD0]));
    
    expect(result.count3dp).toBe(3.142);
    expect(result.count1dp).toBe(3.1);
  })
});

describe('Double', () => {
  it('reads a signed double', () => {
    const spec = new PayloadSpec();

    spec.field('count', Double);
  
    const result: any = spec.exec(Buffer.from([0x40, 0x09, 0x21, 0xCA, 0xC0, 0x83, 0x12, 0x6F]));
    
    expect(result.count).toBe(3.14150000000000018118839761883E0);
  });

  it('has a bitSize of 64', () => {
    const spec = new PayloadSpec();

    spec.field('count', Double);
    spec.field('count2', Double);
  
    const result: any = spec.exec(Buffer.from([0x40, 0x09, 0x21, 0xCA, 0xC0, 0x83, 0x12, 0x6F, 0xC0, 0x8C, 0x36, 0xFA, 0xA0, 0xE9, 0xEF, 0x9A]));
    
    expect(result.count).toBe(3.14150000000000018118839761883E0);
    expect(result.count2).toBe(-902.872377231239852335420437157);
  });

  it('observes endianness', () => {
    const spec = new PayloadSpec(Mode.LE);
  
    spec.field('count', Double);
  
    const result: any = spec.exec(Buffer.from([0x6F, 0x12, 0x83, 0xC0, 0xCA, 0x21, 0x09, 0x40]));
    
    expect(result.count).toBe(3.14150000000000018118839761883E0);
  });

  it('supports options for decimal places', () => {
    const spec = new PayloadSpec();

    spec.field('count3dp', Double, { dp: 3 })
        .field('count10dp', Double, { dp: 10 })

    const result: any = spec.exec(Buffer.from([0x40, 0x09, 0x21, 0xCA, 0xC0, 0x83, 0x12, 0x6F, 0xC0, 0x8C, 0x36, 0xFA, 0xA0, 0xE9, 0xEF, 0x9A]));
    
    expect(result.count3dp).toBe(3.142);
    expect(result.count10dp).toBe(-902.8723772312);

  })
});