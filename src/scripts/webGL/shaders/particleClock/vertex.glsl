uniform vec2 uResolution;
uniform float uTime;
uniform float uScale;
uniform vec3 uColor;
uniform sampler2D uTexture;
uniform float uFallDistance;
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
    float noiseValue = simplexNoise3d(position * 4.0 + uTime);
    noiseValue = (noiseValue + 1.0) / 2.0;
    float delay = noiseValue * 0.7;
    // 各パーティクルの個別進行度を計算
    float individualFallProgress = clamp((uFallProgress - delay) / (1.0 - delay), 0.0, 1.0);
    float alphaProgress = remap(individualFallProgress, 0.15, 0.6, 0.0, 1.0);
    alphaProgress = smoothstep(0.0, 1.0, alphaProgress);

    // Show animation
    float individualShowProgress = clamp((uShowProgress - delay) / (1.0 - delay), 0.0, 1.0);
    float showAlphaProgress = remap(individualShowProgress, 0.62, 0.9, 0.0, 1.0);
    showAlphaProgress = smoothstep(0.0, 1.0, showAlphaProgress);

    vec3 newPosition = position;
    newPosition.y -= individualFallProgress * uFallDistance;
    newPosition.y += (1.0 - individualShowProgress) * uFallDistance;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Picture
    float textureIntensity = texture(uTexture, uv).r;
    textureIntensity = easeInOutQuad(textureIntensity);

    // Point size
    gl_PointSize = uParticleSize * textureIntensity * uResolution.y * uScale;
    gl_PointSize *= (1.0 / - viewPosition.z);

    // Varyings
    vColor = uColor;
    vAlpha = (1.0 - alphaProgress) * showAlphaProgress;
    vIntensity = textureIntensity * uShowProgress;
}
