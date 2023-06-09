# 基础组件

## 项目说明
`LogicFlow`是基于 preact、mobx 以 MVVM 模式进行开发

目前这个项目模仿`LogicFlow`的代码逻辑，进行仿写，在仿写过程中，尝试解决已经存在的`issues`，达到快速学习的目的

> 由于`LogicFlow`的图形底层是基于`svg`而不是`canvas`，因此这个项目依旧保持着`svg`


## 依赖库

`mobx + react 是更繁琐的 Vue`，mobx + react 组合提供的能力恰好是 Vue 与生俱来的

> 本项目还是沿用`mobx + react`的模式

### mobx-vue

而 `mobx-vue` 做的事情则刚好相反：将 Vue 降级成 react 然后再配合 MobX 升级成 Vue，简单点说，就是用 MobX 的响应式机制接管 Vue 的 Watcher，将 Vue 降级成一个纯粹的装载 vdom 的组件渲染引擎。

- `Vue2`类型的`mobx`：https://github.com/mobxjs/mobx-vue
- `Vue3`类型的`mobx`：https://github.com/mobxjs/mobx-vue-lite

> 注: 初衷并不是说 Vue 的响应式机制实现的不好从而要用 MobX 替换掉，而是希望借助 MobX 这个相对中立的状态管理平台，面向不同视图层技术提供一种相对通用的数据层编程范式，从而尽量抹平不同框架间的语法及技术栈差异，这样就可以无缝切换到其它的前端框架，比如mobx+react

## 类型声明

与`LogicFlow`保持一致


## 开发顺序

### 目前LogicFlow的能力

- 图的绘制能力。基于 SVG 来绘制形状各异的节点和线，并提供了基础的节点（矩形、圆形、多边形等）和线（直线、折线、曲线）
- 各类交互能力，让图动起来。根据节点、线、图的各类鼠标事件（hover、点击、拖拽等）做出反应。比如节点拖拽、拖拽创建边、线的调整、双击节点编辑文本等
- 提升编辑效率的能力。提供网格、对齐线，上一步、下一步，键盘快捷键，图放大缩小等配套能力，帮助用户提升编辑效率
- 提供了丰富的 API ，宿主研发通过 API 传参调用和监听事件的方式，与 LogicFlow 完成交互

### 仿写步骤

1. 先把初始化内容写完
2. 然后对照`index.html`进行每一个功能的仿写


1. 可以画出基本图形
2. 图形可以进行拖拽
3. 图形的属性，比如边框之类的
4. 图形之间的连线
5. 一些额外工具的开发，比如全选、放大缩小、获取所有边
