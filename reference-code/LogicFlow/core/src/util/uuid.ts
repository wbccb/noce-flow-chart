import { v4 as uuidv4 } from 'uuid';
import { GraphConfigData } from '../type';

export const createUuid = (): string => {
  const uuid = uuidv4();
  return uuid;
};