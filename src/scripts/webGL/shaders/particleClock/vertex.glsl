uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform sampler2D uTexture;
uniform float uShowProgress;
uniform float uParticleSize;
uniform float uFallProgress;

varying vec3 vColor;
varying float vAlpha;
varying float vIntensity;

#include ../includes/simplexNoise3d.glsl
#include ../includes/remap.glsl

float easeInOutQuad(float x) {
  return x < 0.5 ? 2.0 * x * x : -1.0 + (4.0 - 2.0 * x) * x;
}

void main()
{
    // Fall animation
    float fallProgress = 1.0 - uFallProgress;
    float noiseValue = simplexNoise3d(position * 4.0 + uTime);
    noiseValue = (noiseValue + 1.0) / 2.0;
    float delay = noiseValue * 0.7;
    // 各パーティクルの個別進行度を計算
    float individualFallProgress = clamp((uFallProgress - delay) / (1.0 - delay), 0.0, 1.0);
    float alphaProgress = remap(individualFallProgress, 0.2, 0.5, 0.0, 1.0);
    float fallDistance = 1.0;

    // Show animation
    float individualShowProgress = clamp((uShowProgress - delay) / (1.0 - delay), 0.0, 1.0);
    float showAlphaProgress = remap(individualShowProgress, 0.75, 0.9, 0.0, 1.0);

    vec3 newPosition = position;
    newPosition.y -= individualFallProgress * fallDistance;
    newPosition.y += (1.0 - individualShowProgress) * fallDistance;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Picture
    float pictureIntensity = texture(uTexture, uv).r;
    pictureIntensity = easeInOutQuad(pictureIntensity);

    // Point size
    gl_PointSize = uParticleSize * pictureIntensity * uResolution.y;
    gl_PointSize *= (1.0 / - viewPosition.z);

    // Varyings
    vColor = uColor;
    vAlpha = (1.0 - alphaProgress) * showAlphaProgress;
    vIntensity = pictureIntensity * uShowProgress;
}
