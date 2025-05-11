// Type declarations for modules without declaration files

declare module 'crypto-js' {
  function createHash(algorithm: string): {
    update(message: string): {
      toString(format?: string): string;
    };
  };
  
  function createHmac(algorithm: string, key: string): {
    update(message: string): {
      toString(format?: string): string;
    };
  };
  
  function SHA256(message: string): {
    toString(): string;
  };
  
  function PBKDF2(
    message: string, 
    salt: string, 
    options?: { keySize: number; iterations: number }
  ): {
    toString(): string;
  };
}

declare module 'crypto-js/enc-base64' {
  const Base64: any;
  export default Base64;
}

declare module 'crypto-js/enc-utf8' {
  const Utf8: any;
  export default Utf8;
}

declare module 'crypto-js/aes' {
  const AES: {
    encrypt(message: string, key: string): {
      toString(): string;
    };
    decrypt(ciphertext: string, key: string): {
      toString(encoder: any): string;
    };
  };
  export default AES;
}

declare module 'crypto-js/hmac-sha256' {
  function HmacSHA256(message: string, key: string): {
    toString(): string;
  };
  export default HmacSHA256;
}

declare module 'crypto-js/sha256' {
  function SHA256(message: string): {
    toString(): string;
  };
  export default SHA256;
}

declare module 'qrcode' {
  function toDataURL(data: string): Promise<string>;
  export { toDataURL };
} 