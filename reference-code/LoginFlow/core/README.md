# 基础组件

`LogicFlow`是基于 preact、mobx 以 MVVM 模式进行开发

目前这个项目模仿`LoginFlow`的代码逻辑，使用`vue`+`mobx`进行仿写，在仿写过程中，尝试解决已经存在的`issues`，达到快速学习的目的

> 由于`LoginFlow`的图形底层是基于`svg`而不是`canvas`，因此这个项目依旧保持着`svg`


## 依赖库

`mobx + react 是更繁琐的 Vue`，mobx + react 组合提供的能力恰好是 Vue 与生俱来的

而 `mobx-vue` 做的事情则刚好相反：将 Vue 降级成 react 然后再配合 MobX 升级成 Vue，简单点说，就是用 MobX 的响应式机制接管 Vue 的 Watcher，将 Vue 降级成一个纯粹的装载 vdom 的组件渲染引擎。



- `Vue2`类型的`mobx`：https://github.com/mobxjs/mobx-vue
- `Vue3`类型的`mobx`：https://github.com/mobxjs/mobx-vue-lite

> 注: 初衷并不是说 Vue 的响应式机制实现的不好从而要用 MobX 替换掉，而是希望借助 MobX 这个相对中立的状态管理平台，面向不同视图层技术提供一种相对通用的数据层编程范式，从而尽量抹平不同框架间的语法及技术栈差异，这样就可以无缝切换到其它的前端框架，比如mobx+react

