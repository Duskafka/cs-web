import * as THREE from 'three';

import type { Theme } from '@/store/settingsStore';

/**
 * 3D 씬 조명.
 *
 * 배경에는 아무것도 그리지 않는다. 뇌 윤곽이나 뇌엽 영역을 와이어프레임으로
 * 덧그리면 노드·연결선과 선이 섞여 화면이 탁해지기 때문이다. 뇌 형태는 여전히
 * forces.ts 의 타원체 제약이 만들어내므로, 그리지 않아도 노드 배치 자체가
 * 뇌 윤곽을 이룬다.
 *
 * 노드는 MeshLambertMaterial 이라 광원이 없으면 검게 나온다. react-force-graph 는
 * 자체 three.js 씬을 소유하므로 `fg.scene()` 이 돌려주는 씬에 직접 붙였다 뗀다.
 */

const LIGHT_GROUP_NAME = 'brain-lights';

/** 씬에 조명을 추가하고, 정리 함수를 돌려준다. */
export function attachSceneLights(scene: THREE.Scene, theme: Theme): () => void {
  // 개발 중 HMR 로 두 번 붙는 것을 막는다.
  scene.getObjectByName(LIGHT_GROUP_NAME)?.removeFromParent();

  const lights = new THREE.Group();
  lights.name = LIGHT_GROUP_NAME;

  const ambient = new THREE.AmbientLight(0xffffff, 1.1);
  // 흰 배경에서는 푸른 기가 도는 키 라이트가 화면 전체에 냉기를 남긴다.
  const key = new THREE.DirectionalLight(theme === 'light' ? 0xffffff : 0xbfe9ff, 0.9);
  key.position.set(120, 220, 260);
  lights.add(ambient, key);

  scene.add(lights);

  return () => {
    scene.remove(lights);
  };
}
