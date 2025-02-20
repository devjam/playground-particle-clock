uniform vec3 uFinalColor;
uniform vec3 uColor;

varying float vAlpha;
varying float vIntensity;

void main()
{
  if (vIntensity < 0.08) {
    discard;
  }
  vec2 pointUv = gl_PointCoord;
  vec3 finalColor = vec3(1.0);
  float distanceToCenter = length(pointUv - vec2(0.5));
  if (distanceToCenter > 0.5)
  {
    discard;
  }

  finalColor = mix(uFinalColor, uColor, vAlpha);
  gl_FragColor = vec4(finalColor, vAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
