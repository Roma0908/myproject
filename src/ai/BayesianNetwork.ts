import { SURVIVAL_RISK_CPT, WATER_SHORTAGE_CPT } from '../data/probabilities';
import { BayesianEvidence, BayesianResult, RiskLevel } from '../types/simulation';

export interface BayesianInput {
  temperature: number;
  rainfall: number;
  foodReserve: number;
  residentCount: number;
  tick?: number;
}

export function classifyRiskLevel(probability: number): RiskLevel {
  if (probability >= 0.7) return 'critical';
  if (probability >= 0.45) return 'high';
  if (probability >= 0.22) return 'moderate';
  return 'low';
}

/**
 * Exact Bayesian Network Inference:
 *   High Temperature ──┐
 *                      ▼
 *   Low Rainfall ───▶ Water Shortage ──┐
 *                                      ▼
 *   Food Shortage ────────────────▶ Survival Risk
 *
 * Marginalizes over unknown WaterShortage ∈ {True, False}:
 * P(SurvivalRisk | e) = Σ_w P(WaterShortage = w | HighTemp, LowRainfall)
 *                        * P(SurvivalRisk | WaterShortage = w, FoodShortage)
 */
export function evaluateBayesianRisk(input: BayesianInput): BayesianResult {
  const foodDemandThreshold = Math.max(8, input.residentCount * 4);
  const highTemperature = input.temperature >= 30;
  const lowRainfall = input.rainfall < 25;
  const foodShortage = input.foodReserve < foodDemandThreshold;

  const evidence: BayesianEvidence = {
    highTemperature,
    lowRainfall,
    foodShortage,
    temperatureValue: Number(input.temperature.toFixed(1)),
    rainfallValue: Number(input.rainfall.toFixed(1)),
    foodReserve: Number(input.foodReserve.toFixed(1)),
    foodDemandThreshold,
  };

  const wsKey = `${highTemperature},${lowRainfall}`;
  const pWaterShortage = WATER_SHORTAGE_CPT[wsKey] ?? 0.08;
  const pWaterNotShortage = 1 - pWaterShortage;

  const srGivenWsTrue = SURVIVAL_RISK_CPT[`true,${foodShortage}`] ?? 0.42;
  const srGivenWsFalse = SURVIVAL_RISK_CPT[`false,${foodShortage}`] ?? 0.03;

  const pSurvivalRisk =
    pWaterShortage * srGivenWsTrue + pWaterNotShortage * srGivenWsFalse;

  const roundedWs = Number(pWaterShortage.toFixed(4));
  const roundedRisk = Number(pSurvivalRisk.toFixed(4));
  const riskLevel = classifyRiskLevel(roundedRisk);

  const reasons: string[] = [];
  if (highTemperature) {
    reasons.push(`Жоғары температура (${evidence.temperatureValue}°C ≥ 30°C)`);
  }
  if (lowRainfall) {
    reasons.push(`Төмен жауын-шашын (${evidence.rainfallValue}% < 25%)`);
  }
  if (foodShortage) {
    reasons.push(
      `Азық қоры сұраныс шегінен төмен (${evidence.foodReserve} < ${foodDemandThreshold})`
    );
  }

  const explanation =
    reasons.length > 0
      ? `Дәлелдер: ${reasons.join(', ')}. Су тапшылығы ықтималдығы ${(roundedWs * 100).toFixed(1)}%, нәтижесінде аман қалу қаупі ${(roundedRisk * 100).toFixed(1)}% деңгейіне жетті.`
      : `Қазіргі орта деректері қалыпты (${evidence.temperatureValue}°C, ${evidence.rainfallValue}% жауын, азық ${evidence.foodReserve}). Су тапшылығы ықтималдығы ${(roundedWs * 100).toFixed(1)}%, жалпы қауіп ${(roundedRisk * 100).toFixed(1)}%.`;

  return {
    evidence,
    pWaterShortage: roundedWs,
    pWaterNotShortage: Number(pWaterNotShortage.toFixed(4)),
    pSurvivalRiskGivenWaterShortage: srGivenWsTrue,
    pSurvivalRiskGivenNoWaterShortage: srGivenWsFalse,
    pSurvivalRisk: roundedRisk,
    riskLevel,
    explanation,
    tick: input.tick ?? 0,
  };
}
