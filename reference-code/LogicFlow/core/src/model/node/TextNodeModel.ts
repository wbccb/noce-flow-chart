import { cloneDeep } from 'lodash-es';
import { computed } from '../../util/mobx';
import BaseNodeModel from './BaseNodeModel';
import { ModelType } from '../../constant/constant';
import { getSvgTextWidthHeight } from '../../util/node';

class TextNodeModel extends BaseNodeModel {
  modelType = ModelType.TEXT_NODE;
  getTextStyle(): Record<string, any> {
    const style = super.getTextStyle();
    const { text } = this.graphModel.theme;
    return {
      ...style,
      ...cloneDeep(text),
    };
  }
  @computed get width(): number {
    const rows = String(this.text.value).split(/[\r\n]/g);
    const { fontSize } = this.getTextStyle();
    const { width } = getSvgTextWidthHeight({
      rows,
      fontSize,
      rowsLength: rows.length,
    });
    return width;
  }

  @computed get height(): number {
    const rows = String(this.text.value).split(/[\r\n]/g);
    const { fontSize } = this.getTextStyle();
    const { height } = getSvgTextWidthHeight({
      rows,
      fontSize,
      rowsLength: rows.length,
    });
    return height;
  }

}