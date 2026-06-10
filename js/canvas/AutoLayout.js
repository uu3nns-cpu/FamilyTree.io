/**
 * AutoLayout — 하위 호환 re-export 심
 *
 * ⚠️  이 파일은 로직을 포함하지 않는다.
 *    모든 레이아웃 로직은 GenealogyLayoutEngine.js 에 있다.
 *
 * canvas.js 의 import 경로를 바꾸지 않아도 되도록
 * GenealogyLayoutEngine 을 AutoLayout 이름으로 그대로 내보낸다.
 *
 * ▸ 권장 마이그레이션
 *   import { AutoLayout } from '../canvas/AutoLayout.js';
 *   →
 *   import { GenealogyLayoutEngine as AutoLayout } from '../canvas/GenealogyLayoutEngine.js';
 */

export { GenealogyLayoutEngine as AutoLayout } from './GenealogyLayoutEngine.js';
