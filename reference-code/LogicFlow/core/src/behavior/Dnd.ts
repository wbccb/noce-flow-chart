import { TextConfig } from '../../type';
import LogicFlow from "../LogicFlow";
import {BaseNodeModel} from "../../model";

export type NewNodeConfig = {
  type: string;
  text?: TextConfig | string;
  properties?: Record<string, unknown>;
  [key: string]: any;
};

class Dnd {

  nodeConfig: NewNodeConfig;
  lf: LogicFlow;
  fakerNode: BaseNodeModel;

  constructor(params) {
    const {lf} = params;
    this.lf = lf;
  }
}


export default Dnd;
export {Dnd};