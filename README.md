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
    .field('stationId', Text, { size: 3 })  // 4 bytes of text, utf8 by default

const result = spec.exec(Buffer.from([0xFF, 0x30, 0x19, 0xA0, 0xD4, 0x42, 0x48, 0x36]));

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

Using `then`
---

All data types support a `then` option to do some post processing on the value.  The `then` option should be a function that takes the value read from the buffer as input, and outputs some other value, which may or may not be of the same type.

```
const result = 
  new PayloadSpec()
    .field('numericText', Text, { then: parseInt })
    .field('temperature', UInt8, { then: (f) => (f - 32) * (5/9)})
    .exec(Buffer.from([0x31, 0x32, 0x33, 0xD4]))

expect(result.numericText).toBe(123);
expect(result.temperature).toBe(100);
```