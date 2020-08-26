import { PayloadSpec, Mode } from '../payload_spec';
import { UInt8, Int8, UInt16, Int16, UInt32, Int32 } from '../types';

describe('Data types', () => {
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
});

describe('A PayloadSpec', () => {
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
    })
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
    })
  })

})
