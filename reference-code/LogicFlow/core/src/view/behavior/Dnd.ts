import { TextConfig } from '../../type';
import LogicFlow from "../../LogicFlow";
import BaseNodeModel from "../../model/node/BaseNodeModel";

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


  startDrag(nodeConfig: NewNodeConfig) {
    this.nodeConfig = nodeConfig;
    window.document.addEventListener('mouseup', this.stopDrag);
  }

  stopDrag() {
    this.nodeConfig = null;
    window.document.removeEventListener('mouseup', this.stopDrag);
  }
}


export default Dnd;
export {Dnd};