export class RingBuffer {
  private buffer: Float64Array;
  private capacity: number;
  private count: number = 0;
  private head: number = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Float64Array(capacity);
  }

  push(val: number) {
    this.buffer[this.head] = val;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  toArray(): Float64Array {
    if (this.count < this.capacity) {
      return this.buffer.slice(0, this.count);
    }
    const result = new Float64Array(this.capacity);
    const p1 = this.buffer.subarray(this.head, this.capacity);
    const p2 = this.buffer.subarray(0, this.head);
    result.set(p1);
    result.set(p2, p1.length);
    return result;
  }

  clear() {
    this.count = 0;
    this.head = 0;
  }

  get length() {
    return this.count;
  }
}
