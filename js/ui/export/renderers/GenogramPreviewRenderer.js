/**
 * GenogramPreviewRenderer - 가계도 미리보기 렌더러
 * 
 * 책임:
 * - 가계도 전체를 미리보기 캔버스에 렌더링
 * - GenogramRenderer를 활용하여 관계선 그리기
 * - 인물 노드 그리기
 */

import { PreviewRendererBase } from './PreviewRendererBase.js';
import { GenogramRenderer } from '../../../canvas/GenogramRenderer.js';

export class GenogramPreviewRenderer extends PreviewRendererBase {
  constructor(canvasState) {
    super(canvasState);
  }

  /**
   * 가계도 미리보기 렌더링
   * 
   * @param {HTMLCanvasElement} canvas - 렌더링할 캔버스
   * @param {Object} options - 렌더링 옵션
   */
  render(canvas, options = {}) {
    const {
      displayWidth = 400,
      displayHeight = 250,
      pixelRatio = 2,
      padding = 20
    } = options;

    if (!canvas) {
      console.error('❌ Canvas not found');
      return;
    }

    // 캔버스 설정
    const ctx = this.setupCanvas(canvas, displayWidth, displayHeight, pixelRatio);

    // 바운딩 박스 계산
    const bounds = this.calculateBounds();
    
    console.log('📐 가계도 바운딩 박스:', bounds);

    // 변환 행렬 설정 (중앙 정렬 + 스케일)
    const contentScale = this.setupTransform(ctx, bounds, displayWidth, displayHeight, padding);

    // 설정 가져오기
    const settings = this.getSettings();

    // 관계선 그리기 (GenogramRenderer 활용)
    const genogramRenderer = new GenogramRenderer(ctx, this.canvasState);
    genogramRenderer.renderAllRelationships(this.canvasState.relationships);

    // 인물 그리기
    this.canvasState.persons.forEach(person => {
      this.drawPerson(ctx, person, settings);
    });

    ctx.restore();

    console.log('✅ 가계도 미리보기 렌더링 완료');
  }
}
