import {
  EdgeConfig,
  EdgeFilter,
  NodeConfig,
  Extension,
  ComponentRender,
  FocusOnArgs,
  EdgeData,
  GraphConfigData,
  RegisterElementFn,
  RegisterParam,
  RegisterConfig,
  ExtensionConstructor,
  ZoomParam,
  PointTuple,
} from './type';
import GraphModel from "./model/GraphModel";
import History from "./history/History";
import Tool from "./tool";
import Keyboard from "./keyboard";
import Dnd from "./view/behavior/Dnd";

import * as Options from "./options";
import * as _Model from "./model";
import * as _View from "./view";


//
// type GraphConfigModel = {
//   nodes: _Model.BaseNodeModel[];
//   edges: _Model.BaseEdgeModel[];
// };

type InnerView = ClassDecorator & {
  isObervered: boolean;
};


export default class LogicFlow {

  container: HTMLElement; // DOM的id
  width: number;
  height: number;
  graphModel: GraphModel; // 控制整个画布的model

  history: History;
  viewMap = new Map();

  tool: Tool;
  keyboard: Keyboard;
  dnd: Dnd;

  options: Options.Definition;

  plugins: Extension[];

  components: ComponentRender[] = [];

  extension: Record<string, any> = {}; // 插件扩展方法
  static extensions: Map<string, Extension> = new Map(); // 全局配置的插件，所有的LogicFlow示例都会使用



  constructor(options: Options.Definition) {
    const newOptions = Options.get(options);
    this.options = newOptions;

    this.container = this.initContainer(options.container);
    this.plugins = options.plugins;

    // model初始化
    this.graphModel = new GraphModel({
      ...options
    });

    this.tool = new Tool(this);
    this.history = new History(this.graphModel.eventCenter);
    this.dnd = new Dnd({lf: this});
    this.keyboard = new Keyboard({lf: this, keyboard: options.keyboard});

    // init 放到最后
    this.defaultRegister();
    this.installPlugins(options.disabledPlugins);
  }


  private initContainer(container: HTMLElement) {
    const lfContainer = document.createElement('div');
    lfContainer.style.position = 'relative';
    lfContainer.style.width = '100%';
    lfContainer.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(lfContainer);
    return lfContainer;
  }

  private defaultRegister() {
    this.registerElement({
      view: _View.RectNode,
      model: _Model.RectNodeModel,
      type: 'rect',
    });
  }

  private registerElement(config) {
    let vClass = config.view;
    if (config.isObserverView !== false && !vClass.isObervered) {
      vClass.isObervered = true;
      // @ts-ignore
      vClass = observer(vClass);
    }
    this.setView(config.type, vClass);
    this.graphModel.setModel(config.type, config.model);
  }

  // 内部保留方法，用于移除fakerNode对齐线
  setView(type: string, component) {
    this.viewMap.set(type, component);
  }

  private installPlugins(disabledPlugins = []) {
    // 安装插件，优先使用个性插件
    const extensions = this.plugins ?? LogicFlow.extensions;
    extensions.forEach((extension) => {
      const pluginName = extension.pluginName || extension.name;
      if (disabledPlugins.indexOf(pluginName) === -1) {
        this.installPlugin(extension);
      }
    });
  }

  private installPlugin(extension) {
    if (typeof extension === 'object') {
      const { install, render: renderComponent } = extension;
      install && install.call(extension, this, LogicFlow);
      renderComponent && this.components.push(renderComponent.bind(extension));
      this.extension[extension.pluginName] = extension;
      return;
    }
    const ExtensionCls = extension as ExtensionConstructor;
    const extensionInstance = new ExtensionCls({
      lf: this,
      LogicFlow,
      options: this.options.pluginsOptions,
    });
    extensionInstance.render && this.components.push(
      extensionInstance.render.bind(extensionInstance),
    );
    this.extension[ExtensionCls.pluginName] = extensionInstance;
  }


}