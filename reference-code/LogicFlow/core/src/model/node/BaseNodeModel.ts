import {assign, cloneDeep, isNil} from 'lodash-es';
import {observable, action, toJS, isObservable, computed} from '../../util/mobx';
import {createUuid} from '../../util/uuid';
import {OutlineTheme} from '../../constant/DefaultTheme';
import {
  ModelType, ElementType, OverlapMode, ElementState,
} from '../../constant/constant';
import {
  AdditionData,
  NodeData,
  NodeConfig,
  NodeMoveRule,
  Bounds,
  AnchorConfig,
  PointAnchor,
  AnchorsOffsetItem,
  PointTuple,
  ShapeStyleAttribute,
  IsAllowMove,
  Point,
  AnchorInfo, TextConfig,
} from '../../type';
import GraphModel from '../GraphModel';
import {IBaseModel} from '../BaseModel';
import {formatData} from '../../util/compatible';
import {getClosestAnchor, pickNodeConfig} from '../../util/node';
import {getZIndex} from '../../util/zIndex';
import {BaseEdgeModel} from '../edge';

export type ConnectRule = {
  message: string;
  validate: (
    source?: BaseNodeModel,
    target?: BaseNodeModel,
    sourceAnchor?: AnchorConfig,
    targetAnchor?: AnchorConfig,
    // 调整的边的id，在开启adjustEdgeStartAndEnd后调整边连接的节点时会传入，见https://github.com/didi/LogicFlow/issues/926#issuecomment-1371823306
    edgeId?: string,
  ) => boolean;
};

export type ConnectRuleResult = {
  isAllPass: boolean;
  msg?: string;
};


interface IBaseNodeModel extends IBaseModel {
  /**
   * model基础类型，固定为node
   */
  readonly BaseType: ElementType.NODE,
}


class BaseNodeModel implements IBaseNodeModel {
  // 数据属性
  id = '';
  @observable type = '';
  @observable x = 0;
  @observable y = 0;
  @observable text = {
    value: '',
    x: 0,
    y: 0,
    draggable: false,
    editable: true,
  };
  @observable properties: Record<string, any> = {};
  // 形状属性
  @observable private _width = 100;


  public get width() {
    return this._width;
  }

  public set width(value) {
    this._width = value;
  }

  @observable private _height = 80;
  public get height() {
    return this._height;
  }

  public set height(value) {
    this._height = value;
  }

  @observable anchorsOffset: AnchorsOffsetItem[] = []; // 根据与(x, y)的偏移量计算anchors的坐标
  // 状态属性
  @observable isSelected = false;
  @observable isHovered = false;
  @observable isShowAnchor = false;
  @observable isDragging = false;
  @observable isHitable = true; // 细粒度控制节点是否对用户操作进行反应
  @observable draggable = true;
  @observable visible = true;
  virtual = false;
  // 其它属性
  graphModel: GraphModel;
  @observable zIndex = 1;
  @observable state = 1;
  @observable autoToFront = true; // 节点选中时是否自动置顶，默认为true.
  @observable style: ShapeStyleAttribute = {}; // 每个节点自己的样式，动态修改
  readonly BaseType = ElementType.NODE;
  modelType = ModelType.NODE;
  additionStateData: AdditionData;
  targetRules: ConnectRule[] = [];
  sourceRules: ConnectRule[] = [];
  moveRules: NodeMoveRule[] = []; // 节点移动之前的hook
  hasSetTargetRules = false; // 用来限制rules的重复值
  hasSetSourceRules = false; // 用来限制rules的重复值
  [propName: string]: any; // 支持自定义

  constructor(data: NodeConfig, graphModel: GraphModel) {
    this.graphModel = graphModel;
    this.initNodeData(data);
    this.setAttributes();
  }

  @action
  moveText(deltaX, deltaY): void {
    const {
      x,
      y,
      value,
      draggable,
      editable,
    } = this.text;
    this.text = {
      value,
      editable,
      draggable,
      x: x + deltaX,
      y: y + deltaY,
    };
  }

  @action
  updateText(value: string): void {
    this.text = {
      ...toJS(this.text),
      value,
    };
  }

  @action
  setSelected(flag = true): void {
    this.isSelected = flag;
  }

  @action
  setHovered(flag = true): void {
    this.isHovered = flag;
    this.setIsShowAnchor(flag);
  }

  @action
  setIsShowAnchor(flag = true): void {
    this.isShowAnchor = flag;
  }

  @action
  setHitable(flag = true): void {
    this.isHitable = flag;
  }

  @action
  setElementState(state: number, additionStateData?: AdditionData): void {
    this.state = state;
    this.additionStateData = additionStateData;
  }

  @action
  setProperty(key, val): void {
    this.properties = {
      ...toJS(this.properties),
      [key]: formatData(val),
    };
    this.setAttributes();
  }

  @action
  setProperties(properties): void {
    this.properties = {
      ...toJS(this.properties),
      ...formatData(properties),
    };
    this.setAttributes();
  }

  @action
  deleteProperty(key: string): void {
    delete this.properties[key];
    this.setAttributes();
  }

  @action
  setStyle(key, val): void {
    this.style = {
      ...this.style,
      [key]: formatData(val),
    };
  }

  @action
  setStyles(styles): void {
    this.style = {
      ...this.style,
      ...formatData(styles),
    };
  }

  @action
  updateStyles(styles): void {
    this.style = {
      ...formatData(styles),
    };
  }

  @action
  setZIndex(zIndex = 1): void {
    this.zIndex = zIndex;
  }

  @action
  updateAttributes(attributes) {
    assign(this, attributes);
  }


  getData(): NodeData {
    const { x, y, value } = this.text;
    let { properties } = this;
    if (isObservable(properties)) {
      properties = toJS(properties);
    }
    const data: NodeData = {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      properties,
    };
    if (this.graphModel.overlapMode === OverlapMode.INCREASE) {
      data.zIndex = this.zIndex;
    }
    if (value) {
      data.text = {
        x,
        y,
        value,
      };
    }
    return data;
  }

  getProperties() {
    return toJS(this.properties);
  }

  getNodeStyle(): ShapeStyleAttribute {
    return {
      ...this.graphModel.theme.baseNode,
      ...this.style,
    };
  }

  getTextStyle() {
    // 透传 nodeText
    const { nodeText } = this.graphModel.theme;
    return cloneDeep(nodeText);
  }

  public initNodeData(data: NodeConfig) {
    if (!data.properties) {
      data.properties = {};
    }

    if (!data.id) {
      // 自定义节点id > 全局定义id > 内置
      const {idGenerator} = this.graphModel;
      const globalId = idGenerator && idGenerator(data.type);
      const nodeId = this.createId();
      data.id = nodeId || globalId || createUuid();
    }

    this.formatText(data);
    assign(this, pickNodeConfig(data));
    const {overlapMode} = this.graphModel;
    if (overlapMode === OverlapMode.INCREASE) {
      this.zIndex = data.zIndex || getZIndex();
    }
  }

  // 子类自己实现
  createId() {
    return null;
  }

  formatText(data: NodeConfig) {
    if (!data.text) {
      data.text = {
        value: '',
        x: data.x,
        y: data.y,
        draggable: false,
        editable: true,
      };
    }
    if (data.text && typeof data.text === 'string') {
      data.text = {
        value: data.text,
        x: data.x,
        y: data.y,
        draggable: false,
        editable: true,
      };
    } else if (data.text && (data.text as TextConfig).editable === undefined) {
      (data.text as TextConfig).editable = true;
    }
  }


  // 子类自己实现
  public setAttributes() {
  }
}

export default BaseNodeModel;
export {BaseEdgeModel};