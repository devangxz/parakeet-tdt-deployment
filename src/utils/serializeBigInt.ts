const serializeBigInt = <T>(obj: T): T => JSON.parse(JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

export default serializeBigInt;