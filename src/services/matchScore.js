'use strict';

/**
 * Revbox Match Score Algorithm
 * Specyfikacja: docs/match-score-spec.md
 *
 * Parametry (możliwe do nadpisania przez options):
 *   lambdaFeature = 0.05  — tempo wzrostu wiarygodności cechy
 *   lambdaProduct = 0.01  — tempo wzrostu mocy produktu
 *   beta          = 0.10  — siła bonusu za dużą liczbę opinii
 */
function calculateMatchScore(features, options = {}) {
  const lambdaFeature = options.lambdaFeature ?? 0.05;
  const lambdaProduct = options.lambdaProduct ?? 0.01;
  const beta          = options.beta          ?? 0.10;

  let weightedSum   = 0;
  let weightSum     = 0;
  let totalOpinions = 0;

  for (const feature of features) {
    const positive = Math.max(0, Number(feature.positive || 0));
    const negative = Math.max(0, Number(feature.negative || 0));
    const weight   = Math.max(0, Number(feature.weight   ?? 1));

    const total = positive + negative;
    totalOpinions += total;

    let sentiment  = 0;
    let confidence = 0;

    if (total > 0) {
      sentiment  = (positive - negative) / total;
      confidence = 1 - Math.exp(-lambdaFeature * total);
    }

    const featureScore = weight * sentiment * confidence;
    weightedSum += featureScore;
    weightSum   += weight;
  }

  const rawScore = weightSum > 0 ? weightedSum / weightSum : 0;

  const productPower =
    totalOpinions > 0 ? 1 - Math.exp(-lambdaProduct * totalOpinions) : 0;

  const finalRawScore = rawScore * (1 + beta * productPower);

  const clampedRaw  = Math.max(-1, Math.min(1, finalRawScore));
  const matchScore  = ((clampedRaw + 1) / 2) * 100;

  return {
    matchScore:     Number(matchScore.toFixed(2)),
    rawScore:       Number(rawScore.toFixed(4)),
    finalRawScore:  Number(finalRawScore.toFixed(4)),
    productPower:   Number(productPower.toFixed(4)),
    totalOpinions,
  };
}

module.exports = { calculateMatchScore };
