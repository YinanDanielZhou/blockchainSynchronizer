export function to8ByteHexLittleEndian(num: number | bigint): string {
  // Convert to BigInt to safely handle large numbers (64-bit)
  let bigNum = BigInt(num);

  // Create an 8-byte array
  const bytes = new Uint8Array(8);

  // Fill bytes in little-endian order (least significant byte first)
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(bigNum & 0xffn);
    bigNum >>= 8n;
  }

  // Convert each byte to a 2-digit hex string and join
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function to4ByteHexLittleEndian(num: number): string {
  // Create an 4-byte array 
  const bytes = new Uint8Array(4);

  // Fill bytes in little-endian order (least significant byte first)
  for (let i = 0; i < 4; i++) {
    bytes[i] = Number(num & 0xff);
    num >>= 8;
  }
  // Convert each byte to a 2-digit hex string and join
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function reverseEndianness(hex: string): string {
  // Remove "0x" if present
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }

  // If the hex string has odd length, pad with leading zero
  if (hex.length % 2 !== 0) {
    hex = "0" + hex;
  }

  // Split into bytes, reverse, and join
  const reversed = hex
    .match(/.{2}/g)!
    .reverse()
    .join("");

  return reversed;
}

export function getVarIntPrefix(hexScript: string): string {
  // Remove "0x" if present
  if (hexScript.startsWith("0x")) {
    hexScript = hexScript.slice(2);
  }

  const length = hexScript.length / 2;

  if (length < 0xfd) {
    return length.toString(16).padStart(2, '0');
  } else if (length <= 0xffff) {
    return 'fd' + length.toString(16).padStart(4, '0').match(/../g)!.reverse().join('');
  } else if (length <= 0xffffffff) {
    return 'fe' + length.toString(16).padStart(8, '0').match(/../g)!.reverse().join('');
  } else {
    const hex64 = BigInt(length).toString(16).padStart(16, '0');
    return 'ff' + hex64.match(/../g)!.reverse().join('');
  }
}

export function getPushDataPrefix(hex: string): string {
  // Remove 0x prefix if present
  if (hex.startsWith('0x') || hex.startsWith('0X')) {
    hex = hex.slice(2);
  }

  // Validate even-length hex
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string: must have even length');
  }

  const dataLength = hex.length / 2;

  if (dataLength <= 75) {
    // Minimal push: single-byte length
    return dataLength.toString(16).padStart(2, '0');
  } else if (dataLength <= 0xff) {
    // OP_PUSHDATA1 + length (1 byte)
    return '4c' + dataLength.toString(16).padStart(2, '0');
  } else if (dataLength <= 0xffff) {
    // OP_PUSHDATA2 + length (2 bytes LE)
    const lenLE = dataLength.toString(16).padStart(4, '0').match(/../g)!.reverse().join('');
    return '4d' + lenLE;
  } else if (dataLength <= 0xffffffff) {
    // OP_PUSHDATA4 + length (4 bytes LE)
    const lenLE = dataLength.toString(16).padStart(8, '0').match(/../g)!.reverse().join('');
    return '4e' + lenLE;
  } else {
    throw new Error('Data too large to push onto the stack');
  }
}

export function pushDataHexMinEncoding(hex: string): string {
  // Remove 0x prefix if present
  if (hex.startsWith('0x') || hex.startsWith('0X')) {
    hex = hex.slice(2);
  }

  // Validate even-length hex
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string: must have even length');
  }

  if (hex.length === 2) {
    switch (hex) {
      case "00":  // OP_0
        return "00";
      case "01":  // OP_1
        return "51";
      case "02":
        return "52";
      case "03":
        return "53";
      case "04":
        return "54";
      case "05":
        return "55";
      case "06":
        return "56";
      case "07":
        return "57";
      case "08":
        return "58";
      case "09":
        return "59";
      case "0a":
        return "5a";
      case "0b":
        return "5b";
      case "0c":
        return "5c";
      case "0d":
        return "5d";
      case "0e":
        return "5e";
      case "0f":
        return "5f";
      case "10":  // OP_16
        return "60";
      default:
        return getPushDataPrefix(hex) + hex;
    }
  }
  return getPushDataPrefix(hex) + hex;

  
}

export function numberToHex(num: number): string {
  const hex = num.toString(16);
  // Ensure even length by padding with leading zero if necessary
  return hex.length % 2 === 0 ? hex : '0' + hex;
}