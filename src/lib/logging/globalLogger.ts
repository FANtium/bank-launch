import { type ILogObj, Logger } from 'tslog';

const globalLogger = new Logger<ILogObj>();
export default globalLogger;
