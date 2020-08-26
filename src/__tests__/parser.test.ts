import { PayloadSpec } from '../payload_spec';
import { UInt8, Int8 } from '../types';

describe('Data types', () => {
  describe('UInt8', () => {
    it('reads a single unsigned int', () => {
      const spec = new PayloadSpec();
    
      spec.field('count', UInt8);
    
      const result: any = spec.exec(Buffer.from([0xFF]));
      
      expect(result.count).toBe(255);
    })
    
    it('reads multiple bytes', () => {
      const spec = new PayloadSpec();
    
      spec.field('count', UInt8)
          .field('temp', UInt8)
          .field('humidity', UInt8);
    
      const result: any = spec.exec(Buffer.from([0x1C, 0x2A, 0x03]));
    
      expect(result.count).toBe(28);
      expect(result.temp).toBe(42);
      expect(result.humidity).toBe(3);
    })
  })

  describe('Int8', () => {
    it('reads a single signed int', () => {
      const spec = new PayloadSpec();

      spec.field('count', Int8);
    
      const result: any = spec.exec(Buffer.from([0xFF]));
      
      expect(result.count).toBe(-1);
    })

  });

})

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
    })
  })
})
