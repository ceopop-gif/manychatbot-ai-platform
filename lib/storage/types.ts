export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  size: number;
};

export type FileStorage = {
  put(key: string, value: ArrayBuffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
};