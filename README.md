![build](https://github.com/daizyio/destruct-js/workflows/CI/badge.svg)

destruct-js
===========

destruct-js is a Javascript library for reading binary data from Buffers using a declarative specification, inspired by [construct-js](https://github.com/francisrstokes/construct-js). 

Usage
---

A quick example:

```
const spec = new PayloadSpec();        // big endian by default

spec.field('count', UInt32)            // 4 byte unsigned integer
    .field('temperature', UInt8,       // 1 byte unsigned...
          { then: (f) => (f - 32) * (5/9)}) // ...which we convert from Farenheit to Celsius
    .skip(1)                                //skip a byte
    .field('stationId', Text, { size: 3 })  // 4 bytes of text, utf8 by default

const result = spec.exec(Buffer.from([0xFF, 0x30, 0x19, 0xA0, 0xD4, 0xFF, 0x42, 0x48, 0x36]));

expect(result.count).toBe(4281342368);
expect(result.temperature).toBe(100);
expect(result.stationId).toBe('BH6');
```

Specifications are declared using the `PayloadSpec` object.  To get started, create a `PayloadSpec`.  You can pass the endianness in the constructor, with the default being big endian if nothing is specified.

```
const leSpec = new PayloadSpec(Mode.LE); // little endian
const beSpec = new PayloadSpec();        // big endian is the default
```

Each field in the buffer is specified in order.  Each field has a name, and a data type.  When you call `spec.exec(buffer)`, the buffer is read "left to right", filling a JSON object with field names as keys, which is returned to you once it's finished.  Your spec does not need to read the whole buffer if you don't need to, but obviously you will get an error if you try and read beyond the end of the buffer.

Numeric Data Types
---

All the data types you would expect to see are supported, and if you're reading this probably do not need explanation - `Int8`, `UInt8`, `Int16`, `UInt16`, `Int32`, `UInt32`, `Float`, `Double`.

`Float` and `Double` support an additional `dp` configuration, which limits the number of decimal places

```
const result: any = 
  new PayloadSpec()
    .field('count3dp', Float, { dp: 3 })
    .field('count1dp', Float, { dp: 1 })
    .exec(Buffer.from([0x40, 0x49, 0x0F, 0xD0, 0x40, 0x49, 0x0F, 0xD0]));

expect(result.count3dp).toBe(3.142);
expect(result.count1dp).toBe(3.1);
```

Bool
---

The `Bool` type reads a single bit from the buffer, as a boolean value

```
const result = 
    new PayloadSpec()
      .field('enabled', Bool)
      .field('ledOff', Bool)
      .field('releaseTheHounds', Bool)
      .exec(Buffer.from([0xA0]));

expect(result.enabled).toBe(true);
expect(result.ledOff).toBe(false);
expect(result.releaseTheHounds).toBe(true);
```

Bit, Bits[2-16]
---

The `Bit` type reads a single bit from the buffer, as a 0 or 1.  The types `Bits2` through to `Bits16` read the corresponding number of bits and returns them as unsigned integers. Note that this reads across byte boundaries where necessary.  This means that, for example, `Bits8` is *not* the same as `UInt8`, which will throw an error if trying to read when not aligned to a byte boundary.

```
const result = 
  new PayloadSpec()
    .field('enabled', Bit)
    .field('mode', Bits2)
    .field('frequency', Bits4)
    .field('days', Bits5)
    .exec(Buffer.from([0xD3, 0x3A]));

expect(result.enabled).toBe(1);
expect(result.mode).toBe(2);
expect(result.frequency).toBe(9);
expect(result.days).toBe(19);
```

Text
---

You can read text from the Buffer using the `Text` data type. You can specify a fixed size:

```
const result = 
  new PayloadSpec()
    .field('name', Text, { size: 3 })
    .exec(Buffer.from([0x62, 0x6f, 0x62]));

expect(result.name).toBe('bob');
```

or a terminator character:

```
const result = 
  new PayloadSpec()
    .field('name', Text, { terminator: 0x00 })
    .exec(Buffer.from([0x62, 0x6f, 0x62, 0x00, 0x31, 0x32, 0x33]));

expect(result.name).toBe('bob');
```

or by default it will run to the end of the buffer:

```
const result = 
  new PayloadSpec()
    .field('name', Text)
    .exec(Buffer.from([0x62, 0x6f, 0x62, 0x31, 0x32, 0x33]));

expect(result.name).toBe('bob123');
```

Literals
---

If necessary, you can add a literal string, number or boolean value by specifying it as the second argument to a `.field` or `.store` call. A literal value does not consume any data from the `Buffer`.

```
const result =
  new PayloadSpec()
    .field('type', 'install')
    .store('pi', 3.14)
    .exec(Buffer.from([0x00]))

expect(result.type).toBe('install')
```

Options
---

`then: (any) => any` - All data types support a `then` option to do some post processing on the value.  The `then` option should be a function that takes the value read from the buffer as input, and outputs some other value, which may or may not be of the same type.

```
const result = 
  new PayloadSpec()
    .field('numericText', Text, { size: 3, then: parseInt })
    .field('temperature', UInt8, { then: (f) => (f - 32) * (5/9)})
    .exec(Buffer.from([0x31, 0x32, 0x33, 0xD4]))

expect(result.numericText).toBe(123);
expect(result.temperature).toBe(100);
```

`shouldBe: (string | number | boolean)` - All data types support a `shouldBe` option, that can be used to assert that a particular value should be fixed.  For example, you might use this to check that a particular delimiter is present.  If the value read from the buffer does not match the expected value, a `ParsingError` will be thrown.

```
const result = 
  new PayloadSpec()
    .field('javaClassIdentifier', UInt32, { shouldBe: 0xCAFEBABE })
    .exec(Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]))
```

Other instructions
---

As well as specifying fields using `.field()`, you can use other instructions to modify behaviour of the parser.

`skip(bytes: number | NumericDataType)` - skips the specified number of bytes, or the size of the specified numeric data type.

```
const result = 
  new PayloadSpec()
    .field('firstByte', UInt8)
    .skip(UInt16)               // same as .skip(2)
    .field('lastByte', UInt8)
    .exec(Buffer.from([0xFF, 0x00, 0x00, 0x01]));

expect(result.firstByte).toBe(255);
expect(result.lastByte).toBe(1);
```

`endianness(mode: Mode)` - switches the buffer to reading the specified endianness *from this point* i.e. it does not apply to previously read values.

```
const result = 
  new PayloadSpec(Mode.BE)
    .field('countBE', UInt16)
    .endianness(Mode.LE)
    .field('countLE', UInt16)
    .exec(Buffer.from([0xFF, 0x30, 0x30, 0xFF, 0xFF, 0x30]))
  
expect(result.countBE).toBe(65328);
expect(result.countLE).toBe(65328);
```

`store(name: string, type: DataType)` - fetches a value from the buffer in the same way as `.field()`, but stores the value internally instead of adding to the final output. `.store()` can be used in combination with `.derive()` to use values in later calculations.

```
const result = 
  new PayloadSpec()
    .field('firstByte', UInt8)
    .store('ignoreMe', UInt8)
    .exec(Buffer.from([0xFF, 0x01]));

expect(result.firstByte).toBe(255);
expect(result.ignoreMe).toBeUndefined();
```

`derive(name: string, valueFunction: (r: any) => any)` - calculates a value to add to the result, potentially using values already read from the buffer. The `valueFunction` will be passed an object containing all `field` and `store`d values that have been read to this point.

```
const result =
  new PayloadSpec()
    .field('count', Int8)
    .derive('doubleCount', (r) => r.count * 2)
    .exec(Buffer.from([0x02]))

  expect(result.count).toBe(2);
  expect(result.doubleCount).toBe(4);
```

`pad()` - moves the buffer position to the next byte boundary, for example if you've read a number of `Bit`s

```
const result =
  new PayloadSpec()
    .field('enabled', Bit).pad()
    .field('count', Int8)
    .exec(Buffer.from([0x80, 0x02]))

expect(result.enabled).toBe(true);
expect(result.count).toBe(2);
```