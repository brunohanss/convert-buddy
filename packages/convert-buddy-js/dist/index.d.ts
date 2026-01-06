type ConvertBuddyOptions = {
    debug?: boolean;
};
declare class ConvertBuddy {
    private converter;
    private debug;
    private constructor();
    static create(opts?: ConvertBuddyOptions): Promise<ConvertBuddy>;
    push(chunk: Uint8Array): Uint8Array;
    finish(): Uint8Array;
}

export { ConvertBuddy, type ConvertBuddyOptions };
