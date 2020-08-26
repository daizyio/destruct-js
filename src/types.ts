export interface NumericDataType {
  be: (buffer: Buffer) => (offset: number) => any;
  le: (buffer: Buffer) => (offset: number) => any;
  bitSize: () => number;
}

class UnsignedByte implements NumericDataType {
  public be = (buf: Buffer) => { return buf.readUInt8 };
  public le = (buf: Buffer) => { return buf.readUInt8 };
  public bitSize = () => 8;
}

class SignedByte implements NumericDataType {
  public be = (buf: Buffer) => { return buf.readInt8 };
  public le = (buf: Buffer) => { return buf.readInt8 };
  public bitSize = () => 8;
}

class UnsignedWord implements NumericDataType {
  public be = (buf: Buffer) => { return buf.readUInt16BE };
  public le = (buf: Buffer) => { return buf.readUInt16LE };
  public bitSize = () => 16;
}

class SignedWord implements NumericDataType {
  public be = (buf: Buffer) => { return buf.readInt16BE };
  public le = (buf: Buffer) => { return buf.readInt16LE };
  public bitSize = () => 16;
}

class UnsignedLong implements NumericDataType {
  public be = (buf: Buffer) => { return buf.readUInt32BE };
  public le = (buf: Buffer) => { return buf.readUInt32LE };
  public bitSize = () => 32;
}

class SignedLong implements NumericDataType {
  public be = (buf: Buffer) => { return buf.readInt32BE };
  public le = (buf: Buffer) => { return buf.readInt32LE };
  public bitSize = () => 32;
}

export const UInt8 = new UnsignedByte();
export const Int8 = new SignedByte();
export const UInt16 = new UnsignedWord();
export const Int16 = new SignedWord();
export const UInt32 = new UnsignedLong();
export const Int32 = new SignedLong();