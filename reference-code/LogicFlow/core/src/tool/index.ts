import LogicFlow from "../LogicFlow";


class Tool {
  instance: LogicFlow;

  constructor(instance: LogicFlow) {
    this.instance = instance;
  }
}


export default Tool;
export {Tool};