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

export const UInt8 = new UnsignedByte();
export const Int8 = new SignedByte();