import { map } from 'lodash-es';
import { action, observable, computed } from '../util/mobx';
import BaseNodeModel from './node/BaseNodeModel';
import BaseEdgeModel from './edge/BaseEdgeModel';
import EditConfigModel from './EditConfigModel';
import TransformModel from './TransformModel';
import { IBaseModel } from './BaseModel';
import {
  ElementState, ModelType, EventType, ElementMaxZIndex, ElementType, OverlapMode,
} from '../constant/constant';
import {
  AdditionData,
  Point,
  NodeConfig,
  EdgeConfig,
  PointTuple,
  NodeMoveRule,
  GraphConfigData,
  VirtualRectSize,
} from '../type';
import { updateTheme } from '../util/theme';
import EventEmitter from '../event/eventEmitter';
import { snapToGrid, getGridOffset } from '../util/geometry';
import { isPointInArea } from '../util/graph';
import { getClosestPointOfPolyline, createEdgeGenerator } from '../util/edge';
import { formatData } from '../util/compatible';
import { getNodeAnchorPosition, getNodeBBox } from '../util/node';
import { createUuid } from '../util';
import { getMinIndex, getZIndex } from '../util/zIndex';
import { Theme } from '../constant/DefaultTheme';
import { Definition } from '../options';
import { AnimationConfig } from '../constant/DefaultAnimation';
import { updateAnimation } from '../util/animation';

type BaseNodeModelId = string; // 节点ID
type BaseEdgeModelId = string; // 边ID
type ElementModeId = string;
type BaseElementModel = BaseNodeModel | BaseEdgeModel;
const VisibleMoreSpace = 200;




class GraphModel  {

  rootEl: HTMLElement;
  @observable width: number;
  @observable height: number;

  theme: Theme;
  eventCenter: EventEmitter;
  modelMap = new Map(); // 维护所有节点和边类型对应的model

  topElement: BaseNodeModel | BaseEdgeModel;
  animation: AnimationConfig;

  @observable editConfigModel: EditConfigModel;
  @observable transformModel: TransformModel;
  @observable edgeType: string;

  @observable partial = false;
  @observable overlapMode = OverlapMode.DEFAULT;

  idGenerator: (type?: string) => string;
  edgeGenerator: Definition['edgeGenerator']; // 节点间连线、连线变更时的边的生成规则

  flowId: string;

  @observable nodes: BaseNodeModel[] = [];
  @observable gridSize = 1;

  @observable background;
  @observable edges: BaseEdgeModel[] = [];

  @observable fakerNode: BaseNodeModel;



  constructor(options: Definition) {
    const {
      container,
      background = {},
      grid,
      idGenerator,
      edgeGenerator,
      animation,
    } = options;
    this.background = background;
    if (typeof grid === 'object') {
      this.gridSize = grid.size;
    }
    this.rootEl = container;
    this.editConfigModel = new EditConfigModel(options);
    this.eventCenter = new EventEmitter();
    this.transformModel = new TransformModel(this.eventCenter);
    this.theme = updateTheme(options.style);
    this.edgeType = options.edgeType || 'polyline';
    this.width = options.width;
    this.height = options.height;
    this.animation = updateAnimation(animation);
    this.partial = options.partial;
    // 元素重合时堆叠模式
    // 默认模式，节点和边被选中，会被显示在最上面。当取消选中后，元素会恢复之前的层级。
    // 递增模式，节点和边被选中，会被显示在最上面。当取消选中后，元素会保持层级。
    this.overlapMode = options.overlapMode || 0;
    this.idGenerator = idGenerator;
    this.edgeGenerator = createEdgeGenerator(this, edgeGenerator);
    this.width = options.width || this.rootEl.getBoundingClientRect().width;
    this.height = options.height || this.rootEl.getBoundingClientRect().height;
    this.flowId = createUuid();
  }

  getModel(type: string) {
    return this.modelMap.get(type);
  }

  @computed get selectNodes() {
    const nodes = [];
    this.nodes.forEach(node => {
      if (node.isSelected) {
        nodes.push(node);
      }
    });
    return nodes;
  }

  @action
  addNode(nodeConfig: NodeConfig, eventType: EventType = EventType.NODE_ADD) {
    const nodeOriginData = formatData(nodeConfig);
    // 添加节点的时候，如果这个节点Id已经存在，则采用新的id
    if (nodeOriginData.id && this.nodesMap[nodeConfig.id]) {
      delete nodeOriginData.id;
    }
    const Model = this.getModel(nodeOriginData.type);
    if (!Model) {
      throw new Error(`找不到${nodeOriginData.type}对应的节点，请确认是否已注册此类型节点。`);
    }
    nodeOriginData.x = snapToGrid(nodeOriginData.x, this.gridSize);
    nodeOriginData.y = snapToGrid(nodeOriginData.y, this.gridSize);
    const nodeModel = new Model(nodeOriginData, this);
    this.nodes.push(nodeModel);
    const nodeData = nodeModel.getData();
    this.eventCenter.emit(eventType, { data: nodeData });
    return nodeModel;
  }


  @action
  setModel(type: string, ModelClass) {
    return this.modelMap.set(type, ModelClass);
  }

  getPointByClient({ x: x1, y: y1 }: Point) {
    const bbox = this.rootEl.getBoundingClientRect();
    const domOverlayPosition = {
      x: x1 - bbox.left,
      y: y1 - bbox.top,
    };
    const [x, y] = this.transformModel
      .HtmlPointToCanvasPoint([domOverlayPosition.x, domOverlayPosition.y]);
    return {
      domOverlayPosition,
      canvasOverlayPosition: {
        x,
        y,
      },
    };
  }

  @action
  moveNode2Coordinate(nodeId: BaseNodeModelId, x: number, y: number, isIgnoreRule = false) {
    // 1) 移动节点
    const node = this.nodesMap[nodeId];
    if (!node) {
      console.warn(`不存在id为${nodeId}的节点`);
      return;
    }
    const nodeModel = node.model;
    const {
      x: originX,
      y: originY,
    } = nodeModel;
    const deltaX = x - originX;
    const deltaY = y - originY;
    this.moveNode(nodeId, deltaX, deltaY, isIgnoreRule);
  }

  @computed get nodesMap(): { [key: string]: { index: number, model: BaseNodeModel } } {
    return this.nodes.reduce((nMap, model, index) => {
      nMap[model.id] = { index, model };
      return nMap;
    }, {});
  }

  @computed get edgesMap(): { [key: string]: { index: number, model: BaseEdgeModel } } {
    return this.edges.reduce((eMap, model, index) => {
      eMap[model.id] = { index, model };
      return eMap;
    }, {});
  }


  // 移动节点
  @action
  moveNode(nodeId: BaseNodeModelId, deltaX: number, deltaY: number, isIgnoreRule = false) {
    // 1) 移动节点
    const node = this.nodesMap[nodeId];
    if (!node) {
      console.warn(`不存在id为${nodeId}的节点`);
      return;
    }
    const nodeModel = node.model;
    [deltaX, deltaY] = nodeModel.getMoveDistance(deltaX, deltaY, isIgnoreRule);
    // 2) 移动边
    this.moveEdge(nodeId, deltaX, deltaY);
  }

  // 批量移动节点
  @action
  moveNodes(nodeIds: string[], deltaX: number, deltaY: number, isIgnoreRule = false) {
    // FIX: https://github.com/didi/LogicFlow/issues/1015
    // 如果节点之间存在连线，则只移动连线一次。
    const nodeIdMap = nodeIds.reduce((acc, cur) => {
      const nodeModel = this.nodesMap[cur].model;
      const moveDistance = nodeModel.getMoveDistance(deltaX, deltaY, isIgnoreRule);
      acc[cur] = moveDistance;
      return acc;
    }, {});
    for (let i = 0; i < this.edges.length; i++) {
      const edgeModel = this.edges[i];
      const sourceMoveDistance = nodeIdMap[edgeModel.sourceNodeId];
      let textDistanceX;
      let textDistanceY;
      if (sourceMoveDistance) {
        [textDistanceX, textDistanceY] = sourceMoveDistance;
        edgeModel.moveStartPoint(textDistanceX, textDistanceY);
      }
      const targetMoveDistance = nodeIdMap[edgeModel.targetNodeId];
      if (targetMoveDistance) {
        [textDistanceX, textDistanceY] = targetMoveDistance;
        edgeModel.moveEndPoint(textDistanceX, textDistanceY);
      }
      if (sourceMoveDistance || targetMoveDistance) {
        edgeModel.moveText(textDistanceX, textDistanceY);
      }
    }
  }

  @action
  moveEdge(nodeId: BaseNodeModelId, deltaX: number, deltaY: number) {
    /* 更新相关边位置 */
    for (let i = 0; i < this.edges.length; i++) {
      const edgeModel = this.edges[i];
      const { x, y } = edgeModel.textPosition;
      const nodeAsSource = this.edges[i].sourceNodeId === nodeId;
      const nodeAsTarget = this.edges[i].targetNodeId === nodeId;
      if (nodeAsSource) {
        edgeModel.moveStartPoint(deltaX, deltaY);
      }
      if (nodeAsTarget) {
        edgeModel.moveEndPoint(deltaX, deltaY);
      }
      // 如果有文案了，当节点移动引起文案位置修改时，找出当前文案位置与最新边距离最短距离的点
      // 最大程度保持节点位置不变且在边上
      if (nodeAsSource || nodeAsTarget) {
        // todo: 找到更好的边位置移动处理方式
        // 如果是自定义边文本位置，则移动节点的时候重新计算其位置
        if (edgeModel.customTextPosition === true) {
          edgeModel.resetTextPosition();
        } else if (edgeModel.modelType === ModelType.POLYLINE_EDGE && edgeModel.text?.value) {
          const textPosition = edgeModel.text;
          const newPoint = getClosestPointOfPolyline(textPosition, edgeModel.points);
          edgeModel.moveText(newPoint.x - textPosition.x, newPoint.y - textPosition.y);
        } else {
          const { x: x1, y: y1 } = edgeModel.textPosition;
          edgeModel.moveText(x1 - x, y1 - y);
        }
      }
    }
  }

  // 当前编辑的元素，低频操作，先循环找。
  @computed get textEditElement() {
    const textEditNode = this.nodes.find(node => node.state === ElementState.TEXT_EDIT);
    const textEditEdge = this.edges.find(edge => edge.state === ElementState.TEXT_EDIT);
    return textEditNode || textEditEdge;
  }

  @action
  setElementStateById(id: ElementModeId, state: number, additionStateData?: AdditionData) {
    this.nodes.forEach((node) => {
      if (node.id === id) {
        node.setElementState(state, additionStateData);
      } else {
        node.setElementState(ElementState.DEFAULT);
      }
    });
    this.edges.forEach((edge) => {
      if (edge.id === id) {
        edge.setElementState(state, additionStateData);
      } else {
        edge.setElementState(ElementState.DEFAULT);
      }
    });
  }

  @action selectEdgeById(id: string, multiple = false) {
    if (!multiple) {
      this.clearSelectElements();
    }
    const selectElement = this.edgesMap[id]?.model;
    selectElement?.setSelected(true);
  }

  @computed get selectElements() {
    const elements = new Map();
    this.nodes.forEach(node => {
      if (node.isSelected) {
        elements.set(node.id, node);
      }
    });
    this.edges.forEach(edge => {
      if (edge.isSelected) {
        elements.set(edge.id, edge);
      }
    });
    return elements;
  }

  // 选中节点
  @action selectNodeById(id: string, multiple = false) {
    if (!multiple) {
      this.clearSelectElements();
    }
    const selectElement = this.nodesMap[id]?.model;
    selectElement?.setSelected(true);
  }

  // 清除所有的选中元素
  @action
  clearSelectElements() {
    this.selectElements.forEach(element => {
      element?.setSelected(false);
    });
    this.selectElements.clear();
    /**
     * 如果堆叠模式为默认模式，则将置顶元素重新恢复原有层级
     */
    if (this.overlapMode === OverlapMode.DEFAULT) {
      this.topElement?.setZIndex();
    }
  }

  // 将某个元素放置到顶部。
  // 如果堆叠模式为默认模式，则将原置顶元素重新恢复原有层级。
  // 如果堆叠模式为递增模式，则将需指定元素zIndex设置为当前最大zIndex + 1。
  @action
  toFront(id) {
    const element = this.nodesMap[id]?.model || this.edgesMap[id]?.model;
    if (element) {
      if (this.overlapMode === OverlapMode.DEFAULT) {
        this.topElement?.setZIndex();
        element.setZIndex(ElementMaxZIndex);
        this.topElement = element;
      }
      if (this.overlapMode === OverlapMode.INCREASE) {
        this.setElementZIndex(id, 'top');
      }
    }
  }

  @action
  setElementZIndex(id: string, zIndex: number | 'top' | 'bottom') {
    const element = this.nodesMap[id]?.model || this.edgesMap[id]?.model;
    if (element) {
      let index;
      if (typeof zIndex === 'number') {
        index = zIndex;
      }
      if (zIndex === 'top') {
        index = getZIndex();
      }
      if (zIndex === 'bottom') {
        index = getMinIndex();
      }
      element.setZIndex(index);
    }
  }

  getNodeModelById(nodeId: BaseNodeModelId): BaseNodeModel {
    if (this.fakerNode && nodeId === this.fakerNode.id) {
      return this.fakerNode;
    }
    return this.nodesMap[nodeId]?.model;
  }

  @action
  addEdge(edgeConfig: EdgeConfig): BaseEdgeModel {
    const edgeOriginData = formatData(edgeConfig);
    // 边的类型优先级：自定义>全局>默认
    let { type } = edgeOriginData;
    if (!type) {
      type = this.edgeType;
    }
    if (edgeOriginData.id && this.edgesMap[edgeOriginData.id]) {
      delete edgeOriginData.id;
    }
    const Model = this.getModel(type);
    if (!Model) {
      throw new Error(`找不到${type}对应的边，请确认是否已注册此类型边。`);
    }
    const edgeModel = new Model({ ...edgeOriginData, type }, this);
    const edgeData = edgeModel.getData();
    this.edges.push(edgeModel);
    this.eventCenter.emit(EventType.EDGE_ADD, { data: edgeData });
    return edgeModel;
  }

  @action
  deleteEdgeById(id) {
    const edge = this.edgesMap[id];
    if (!edge) {
      return;
    }
    const idx = this.edgesMap[id].index;
    const edgeData = this.edgesMap[id].model.getData();
    this.edges.splice(idx, 1);
    this.eventCenter.emit(EventType.EDGE_DELETE, { data: edgeData });
  }

}


export {GraphModel};
export default GraphModel;